const DeviceToken = require('../models/DeviceToken');
const { sendExpoPush } = require('./notificationService');

async function getUserPushTokens(userId) {
  const devices = await DeviceToken.find({ userId, enabled: true });
  const tokens = devices.map((d) => d.token).filter(Boolean);
  return Array.from(new Set(tokens));
}

async function sendPushToUser(userId, message) {
  const tokens = await getUserPushTokens(userId);
  if (!tokens.length) return { ok: true, skipped: true };
  return sendExpoPush(tokens, message);
}

module.exports = { getUserPushTokens, sendPushToUser }; 