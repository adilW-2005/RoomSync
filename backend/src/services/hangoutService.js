const mongoose = require('mongoose');
const Hangout = require('../models/Hangout');
const Group = require('../models/Group');
const { notifyUsers } = require('./notificationService');
const { sanitizeText } = require('./moderationService');

function getCurrentGroupIdForUser(user) {
  const groupId = (user.groups || [])[0];
  if (!groupId) {
    const err = new Error('User not in a group');
    err.status = 400;
    err.code = 'NO_GROUP';
    throw err;
  }
  return String(groupId);
}

async function ensureMember(groupId, userId) {
  const group = await Group.findById(groupId);
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    err.code = 'GROUP_NOT_FOUND';
    throw err;
  }
  if (!(group.members || []).map(String).includes(String(userId))) {
    const err = new Error('Forbidden');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }
}

async function listHangouts(user, { groupId }) {
  const gid = groupId || getCurrentGroupIdForUser(user);
  const items = await Hangout.find({ groupId: gid }).sort({ createdAt: -1 });
  return items.map((h) => h.toJSON());
}

async function createHangout(user, payload) {
  const gid = payload.groupId || getCurrentGroupIdForUser(user);
  await ensureMember(gid, user._id);
  const options = (payload.options || []).map((o) => ({ id: String(o.id), label: o.label, when: o.when ? new Date(o.when) : undefined }));
  const h = await Hangout.create({ groupId: gid, title: payload.title, description: payload.description || '', options, votes: [], rsvps: [], messages: [], createdBy: user._id });
  try {
    const group = await Group.findById(gid);
    const others = (group.members || []).filter((m) => String(m) !== String(user._id));
    if (others.length) await notifyUsers(others, 'hangouts', 'New hangout proposal', payload.title || '');
  } catch (_) {}
  return h.toJSON();
}

async function vote(user, id, { optionId }) {
  const h = await Hangout.findById(id);
  if (!h) { const err = new Error('Hangout not found'); err.status = 404; err.code = 'HANGOUT_NOT_FOUND'; throw err; }
  await ensureMember(h.groupId, user._id);
  h.votes = (h.votes || []).filter((v) => String(v.userId) !== String(user._id));
  h.votes.push({ userId: user._id, optionId: String(optionId), at: new Date() });
  await h.save();
  try {
    const group = await Group.findById(h.groupId);
    const others = (group.members || []).filter((m) => String(m) !== String(user._id));
    if (others.length) await notifyUsers(others, 'hangouts', 'New vote', `${user.name || 'Someone'} voted`);
  } catch (_) {}
  return h.toJSON();
}

async function setRsvp(user, id, { status }) {
  const allowed = ['going', 'maybe', 'not'];
  if (!allowed.includes(status)) { const err = new Error('Invalid RSVP'); err.status = 400; err.code = 'INVALID_RSVP'; throw err; }
  const h = await Hangout.findById(id);
  if (!h) { const err = new Error('Hangout not found'); err.status = 404; err.code = 'HANGOUT_NOT_FOUND'; throw err; }
  await ensureMember(h.groupId, user._id);
  const idx = (h.rsvps || []).findIndex((r) => String(r.userId) === String(user._id));
  if (idx >= 0) { h.rsvps[idx].status = status; h.rsvps[idx].at = new Date(); } else { h.rsvps.push({ userId: user._id, status, at: new Date() }); }
  await h.save();
  try {
    const group = await Group.findById(h.groupId);
    const others = (group.members || []).filter((m) => String(m) !== String(user._id));
    if (others.length) await notifyUsers(others, 'hangouts', 'RSVP update', `${user.name || 'Someone'} is ${status}`);
  } catch (_) {}
  return h.toJSON();
}

async function postMessage(user, id, { text }) {
  const h = await Hangout.findById(id);
  if (!h) { const err = new Error('Hangout not found'); err.status = 404; err.code = 'HANGOUT_NOT_FOUND'; throw err; }
  await ensureMember(h.groupId, user._id);
  h.messages = h.messages || [];
  const safe = sanitizeText(text || '');
  h.messages.push({ userId: user._id, text: safe, createdAt: new Date() });
  await h.save();
  try {
    const group = await Group.findById(h.groupId);
    const others = (group.members || []).filter((m) => String(m) !== String(user._id));
    if (others.length) await notifyUsers(others, 'hangouts', 'New message', safe.slice(0, 140));
  } catch (_) {}
  return h.toJSON();
}

module.exports = { listHangouts, createHangout, vote, setRsvp, postMessage }; 