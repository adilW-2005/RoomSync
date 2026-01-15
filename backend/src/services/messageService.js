const Joi = require('joi');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { tryGetIO } = require('../socket');
const { notifyUsers } = require('./notificationService');
const { uploadBase64ToCloudinary } = require('./cloudinaryService');
const { isBlocked, sanitizeText } = require('./moderationService');
const { handle: orchestrate } = require('./notificationOrchestrator');

const imageBase64Schema = Joi.alternatives().try(
  Joi.string().base64({ paddingRequired: false }),
  Joi.string().pattern(/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/)
);

function buildStableKey({ type, userAId, userBId, listingId }) {
  const a = String(userAId);
  const b = String(userBId);
  const [u1, u2] = a < b ? [a, b] : [b, a];
  return type === 'listing' ? `listing:${String(listingId)}:${u1}:${u2}` : `dm:${u1}:${u2}`;
}

async function getOrCreateConversation(currentUser, payload) {
  const schema = Joi.object({
    type: Joi.string().valid('dm', 'listing').required(),
    otherUserId: Joi.string().required(),
    listingId: Joi.string().when('type', { is: 'listing', then: Joi.required() }),
  });
  const { error, value } = schema.validate(payload);
  if (error) {
    const err = new Error('Invalid input');
    err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err;
  }
  const userAId = currentUser._id;
  const userBId = value.otherUserId;
  if (await isBlocked(userAId, userBId)) {
    const err = new Error('Forbidden'); err.status = 403; err.code = 'FORBIDDEN'; throw err;
  }

  // Enforce policy: only listing conversations are allowed
  if (value.type !== 'listing') {
    const err = new Error('Direct messages are disabled'); err.status = 403; err.code = 'DM_DISABLED'; throw err;
  }

  const filter = { type: value.type, 'participants.userId': { $all: [userAId, userBId] } };
  if (value.type === 'listing') filter.listingId = value.listingId;
  let convo = await Conversation.findOne(filter);
  if (!convo) {
    convo = await Conversation.create({
      type: value.type,
      listingId: value.type === 'listing' ? value.listingId : undefined,
      participants: [
        { userId: userAId, unreadCount: 0, lastReadAt: new Date() },
        { userId: userBId, unreadCount: 0 },
      ],
      lastMessage: undefined,
    });
  }
  return shapeConversation(convo, currentUser._id);
}

function shapeConversation(convo, viewerId) {
  const json = convo.toJSON();
  const parts = Array.isArray(json.participants) ? json.participants : [];
  const youRaw = parts.find((p) => String(p?.userId || '') === String(viewerId)) || parts[0] || { userId: viewerId, unreadCount: 0, lastReadAt: null };
  const otherRaw = parts.find((p) => String(p?.userId || '') !== String(viewerId)) || parts[1] || { userId: null, unreadCount: 0, lastReadAt: null };
  return {
    id: json.id,
    type: json.type,
    listingId: json.listingId,
    participants: [
      { userId: String(youRaw.userId || viewerId), unreadCount: youRaw.unreadCount || 0, lastReadAt: youRaw.lastReadAt || null },
      { userId: otherRaw.userId ? String(otherRaw.userId) : null, unreadCount: otherRaw.unreadCount || 0, lastReadAt: otherRaw.lastReadAt || null },
    ],
    lastMessage: json.lastMessage || null,
    updatedAt: json.updatedAt,
  };
}

async function listConversations(currentUser, { page = 1, limit = 20 } = {}) {
  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
  // Return only listing conversations per policy
  const items = await Conversation.find({ 'participants.userId': currentUser._id, type: 'listing' }).sort({ updatedAt: -1 }).skip(skip).limit(limit);
  return items.map((c) => shapeConversation(c, currentUser._id));
}

async function sendInConversation(currentUser, payload) {
  const schema = Joi.object({
    conversationId: Joi.string().required(),
    text: Joi.string().allow('').optional(),
    photosBase64: Joi.array().items(imageBase64Schema).optional(),
  });
  const { error, value } = schema.validate(payload || {});
  if (error) {
    const err = new Error('Invalid input'); err.status = 400; err.code = 'VALIDATION_ERROR'; err.details = error.details.map((d) => d.message); throw err;
  }
  const convo = await Conversation.findById(value.conversationId);
  if (!convo) { const err = new Error('Conversation not found'); err.status = 404; err.code = 'NOT_FOUND'; throw err; }
  const participantIds = convo.participants.map((p) => String(p.userId));
  if (!participantIds.includes(String(currentUser._id))) { const err = new Error('Forbidden'); err.status = 403; err.code = 'FORBIDDEN'; throw err; }
  if (convo.type !== 'listing') { const err = new Error('Messaging disabled for this conversation'); err.status = 403; err.code = 'DM_DISABLED'; throw err; }
  const otherUserId = convo.participants.find((p) => String(p.userId) !== String(currentUser._id)).userId;
  if (await isBlocked(currentUser._id, otherUserId)) { const err = new Error('Forbidden'); err.status = 403; err.code = 'FORBIDDEN'; throw err; }

  let photos = [];
  if (Array.isArray(value.photosBase64) && value.photosBase64.length) {
    for (const b64 of value.photosBase64) {
      // eslint-disable-next-line no-await-in-loop
      const url = await uploadBase64ToCloudinary(b64, 'messages');
      photos.push(url);
    }
  }
  const safeText = sanitizeText(value.text || '');
  const msg = await Message.create({
    conversationId: convo._id,
    listingId: convo.type === 'listing' ? convo.listingId : undefined,
    fromUserId: currentUser._id,
    toUserId: otherUserId,
    text: safeText,
    photos,
  });

  // Update conversation summary and unread
  convo.lastMessage = { text: safeText, photos, fromUserId: currentUser._id, createdAt: msg.createdAt };
  for (const p of convo.participants) {
    if (String(p.userId) === String(currentUser._id)) continue;
    p.unreadCount = (p.unreadCount || 0) + 1;
  }
  await convo.save();

  const shaped = msg.toJSON();
  const io = tryGetIO();
  if (io) {
    for (const p of convo.participants) {
      io.to(String(p.userId)).emit('dm:message', { conversationId: String(convo._id), message: shaped });
    }
  }
  try {
    await orchestrate({
      type: 'chat.message.new',
      userIdTargets: [otherUserId],
      title: 'New message',
      body: safeText ? safeText.slice(0, 120) : 'You have a new message',
      data: { conversationId: String(convo._id) },
      deeplink: `roomsync://chat/conversation/${String(convo._id)}`,
      priority: 'high',
    });
  } catch (_) {}
  return { conversation: shapeConversation(convo, currentUser._id), message: shaped };
}

async function listMessages(currentUser, { conversationId, page = 1, limit = 30 }) {
  const convo = await Conversation.findById(conversationId);
  if (!convo) { const err = new Error('Conversation not found'); err.status = 404; err.code = 'NOT_FOUND'; throw err; }
  const participantIds = convo.participants.map((p) => String(p.userId));
  if (!participantIds.includes(String(currentUser._id))) { const err = new Error('Forbidden'); err.status = 403; err.code = 'FORBIDDEN'; throw err; }
  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
  const messages = await Message.find({ conversationId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
  return messages.map((m) => m.toJSON());
}

async function markRead(currentUser, { conversationId }) {
  const convo = await Conversation.findById(conversationId);
  if (!convo) { const err = new Error('Conversation not found'); err.status = 404; err.code = 'NOT_FOUND'; throw err; }
  for (const p of convo.participants) {
    if (String(p.userId) === String(currentUser._id)) {
      p.unreadCount = 0; p.lastReadAt = new Date();
    }
  }
  await convo.save();
  const io = tryGetIO();
  if (io) {
    for (const p of convo.participants) {
      io.to(String(p.userId)).emit('dm:read', { conversationId: String(convo._id), userId: String(currentUser._id), readAt: new Date().toISOString() });
    }
  }
  return shapeConversation(convo, currentUser._id);
}

async function getOrCreateFromListing(currentUser, { listingId, sellerId }) {
  return getOrCreateConversation(currentUser, { type: 'listing', otherUserId: sellerId, listingId });
}

async function getOrCreateDM(currentUser, { otherUserId }) {
  const err = new Error('Direct messages are disabled'); err.status = 403; err.code = 'DM_DISABLED'; throw err;
}

module.exports = { getOrCreateConversation, getOrCreateFromListing, getOrCreateDM, listConversations, sendInConversation, listMessages, markRead }; 