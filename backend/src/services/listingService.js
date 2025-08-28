const Listing = require('../models/Listing');
const User = require('../models/User');
const Message = require('../models/Message');
const { uploadBase64ToCloudinary } = require('./cloudinaryService');
const { tryGetIO } = require('../socket');
const { notifyUsers } = require('./notificationService');
const { isBlocked, sanitizeText } = require('./moderationService');
const { handle: orchestrate } = require('./notificationOrchestrator');

async function listListings(query = {}) {
  const filter = {};
  if (query.type) filter.type = query.type;
  if (query.q) filter.title = { $regex: query.q, $options: 'i' };
  if (query.min !== undefined || query.max !== undefined) {
    filter.price = {};
    if (query.min !== undefined) filter.price.$gte = Number(query.min);
    if (query.max !== undefined) filter.price.$lte = Number(query.max);
  }
  if (query.category) filter.categories = { $in: [query.category] };
  filter.status = 'available';
  let sort = { createdAt: -1 };
  if (query.sort === 'price_asc') sort = { price: 1 };
  if (query.sort === 'price_desc') sort = { price: -1 };
  if (query.sort === 'date_desc') sort = { createdAt: -1 };
  if (query.sort === 'date_asc') sort = { createdAt: 1 };
  const items = await Listing.find(filter).sort(sort);
  return items.map((i) => i.toJSON());
}

async function createListing(user, payload) {
  let photos = Array.isArray(payload.photos) ? payload.photos : [];
  if (Array.isArray(payload.photosBase64) && payload.photosBase64.length) {
    const uploaded = [];
    for (const b64 of payload.photosBase64) {
      // eslint-disable-next-line no-await-in-loop
      const url = await uploadBase64ToCloudinary(b64, 'listings');
      uploaded.push(url);
    }
    photos = photos.concat(uploaded);
  }
  const listing = await Listing.create({
    sellerId: user._id,
    type: payload.type,
    categories: Array.isArray(payload.categories) ? payload.categories : [],
    title: payload.title,
    description: payload.description || '',
    price: Number(payload.price),
    photos,
    loc: payload.loc ? { lat: Number(payload.loc.lat), lng: Number(payload.loc.lng) } : undefined,
    availableFrom: payload.availableFrom ? new Date(payload.availableFrom) : undefined,
    availableTo: payload.availableTo ? new Date(payload.availableTo) : undefined,
    status: 'available',
  });
  return listing.toJSON();
}

async function updateListing(user, id, updates) {
  const listing = await Listing.findById(id);
  if (!listing) {
    const err = new Error('Listing not found');
    err.status = 404;
    err.code = 'LISTING_NOT_FOUND';
    throw err;
  }
  if (String(listing.sellerId) !== String(user._id)) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  const allowed = ['title', 'description', 'price', 'photos', 'loc', 'availableFrom', 'availableTo', 'status', 'type', 'categories'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === 'price') listing.price = Number(updates.price);
      else if (key === 'loc') listing.loc = { lat: Number(updates.loc.lat), lng: Number(updates.loc.lng) };
      else if (key === 'availableFrom' || key === 'availableTo') listing[key] = updates[key] ? new Date(updates[key]) : undefined;
      else if (key === 'categories') listing.categories = Array.isArray(updates.categories) ? updates.categories : [];
      else listing[key] = updates[key];
    }
  }
  await listing.save();
  return listing.toJSON();
}

async function toggleFavorite(user, listingId, fav) {
  const op = fav ? { $addToSet: { favoriteListings: listingId } } : { $pull: { favoriteListings: listingId } };
  await User.updateOne({ _id: user._id }, op);
  const fresh = await User.findById(user._id);
  try {
    const listing = await Listing.findById(listingId);
    if (listing && fav) {
      await orchestrate({
        type: 'marketplace.listing.favorited',
        userIdTargets: [listing.sellerId],
        title: 'Listing favorited',
        body: `${fresh.name || 'Someone'} favorited your listing`,
        data: { listingId: String(listing._id) },
        deeplink: `roomsync://marketplace/listing/${String(listing._id)}`,
        priority: 'low',
      });
    }
  } catch (_) {}
  return fresh.toJSON();
}

async function sendMessage(user, payload) {
  const { listingId, toUserId, text, photosBase64 } = payload;
  if (await isBlocked(user._id, toUserId)) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
  let photos = [];
  if (Array.isArray(photosBase64) && photosBase64.length) {
    for (const b64 of photosBase64) {
      // eslint-disable-next-line no-await-in-loop
      const url = await uploadBase64ToCloudinary(b64, 'messages');
      photos.push(url);
    }
  }
  const safeText = sanitizeText(text || '');
  const msg = await Message.create({ listingId: listingId || undefined, fromUserId: user._id, toUserId, text: safeText, photos });
  const io = tryGetIO();
  if (io) {
    io.to(String(toUserId)).emit('chat:message', { ...msg.toJSON() });
  }
  // Push
  try { await notifyUsers([toUserId], 'messages', 'New message', safeText || ''); } catch (_) {}
  try {
    const listing = listingId ? await Listing.findById(listingId) : null;
    await orchestrate({
      type: 'marketplace.message',
      userIdTargets: [toUserId],
      title: 'New message about your listing',
      body: safeText ? safeText.slice(0, 120) : 'You have a new message',
      data: { listingId: listing ? String(listing._id) : undefined },
      deeplink: listing ? `roomsync://marketplace/listing/${String(listing._id)}` : undefined,
      priority: 'high',
    });
  } catch (_) {}
  return msg.toJSON();
}

async function listMessages(user, { withUserId, listingId }) {
  if (await isBlocked(user._id, withUserId)) return [];
  const filter = { $or: [
    { fromUserId: user._id, toUserId: withUserId },
    { fromUserId: withUserId, toUserId: user._id },
  ] };
  if (listingId) filter.listingId = listingId;
  const items = await Message.find(filter).sort({ createdAt: 1 });
  return items.map((m) => m.toJSON());
}

module.exports = { listListings, createListing, updateListing, toggleFavorite, sendMessage, listMessages }; 