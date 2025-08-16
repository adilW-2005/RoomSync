const { Report, Block } = require('../models/Report');

function containsProfanity(text = '') {
  const banned = ['badword'];
  const lower = String(text || '').toLowerCase();
  return banned.some((w) => lower.includes(w));
}

function sanitizeText(text = '') {
  const banned = ['badword'];
  let out = String(text || '');
  for (const w of banned) {
    const re = new RegExp(w, 'gi');
    out = out.replace(re, '***');
  }
  return out;
}

async function isBlocked(userId, otherUserId) {
  const exists = await Block.findOne({ $or: [
    { userId, blockedUserId: otherUserId },
    { userId: otherUserId, blockedUserId: userId },
  ] });
  return !!exists;
}

async function reportContent(user, payload) {
  const { targetType, targetId, reason } = payload;
  const r = await Report.create({ reporterId: user._id, targetType, targetId, reason: reason || '' });
  return r.toJSON();
}

async function listReports(_user, { status }) {
  const filter = {};
  if (status) filter.status = status;
  const items = await Report.find(filter).sort({ createdAt: -1 }).limit(200);
  return items.map((r) => r.toJSON());
}

async function updateReportStatus(_user, id, status) {
  const allowed = ['open', 'reviewed', 'actioned', 'dismissed'];
  if (!allowed.includes(status)) { const err = new Error('Invalid status'); err.status = 400; err.code = 'INVALID_STATUS'; throw err; }
  await Report.updateOne({ _id: id }, { $set: { status } });
  const fresh = await Report.findById(id);
  return fresh ? fresh.toJSON() : null;
}

async function blockUser(user, blockedUserId) {
  const existing = await Block.findOne({ userId: user._id, blockedUserId });
  if (existing) return existing.toJSON();
  const b = await Block.create({ userId: user._id, blockedUserId });
  return b.toJSON();
}

async function listBlocks(user) {
  const items = await Block.find({ userId: user._id });
  return items.map((b) => b.toJSON());
}

module.exports = { containsProfanity, sanitizeText, isBlocked, reportContent, listReports, updateReportStatus, blockUser, listBlocks }; 