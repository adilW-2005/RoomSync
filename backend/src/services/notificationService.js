const fetch = require('node-fetch');
const { loadEnv } = require('../config/env');
const User = require('../models/User');

async function sendExpoPush(expoPushTokens, message) {
  const { PUSH_ENABLED, NODE_ENV } = loadEnv();
  if (NODE_ENV === 'test' || PUSH_ENABLED !== 'true') return { ok: true, skipped: true };
  if (!expoPushTokens || expoPushTokens.length === 0) return { ok: true, skipped: true };
  const chunks = [];
  for (const token of expoPushTokens) {
    chunks.push({ to: token, sound: 'default', ...message });
  }
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(chunks),
  });
  if (!res.ok) {
    const text = await res.text();
    // eslint-disable-next-line no-console
    console.warn('Push failed:', text);
    return { ok: false };
  }
  return { ok: true };
}

async function notifyUsers(userIds, channel, title, body) {
  const users = await User.find({ _id: { $in: userIds } });
  const tokens = users
    .filter((u) => u.notificationPrefs?.[channel] !== false)
    .flatMap((u) => Array.isArray(u.pushTokens) ? u.pushTokens : []);
  return sendExpoPush(tokens, { title, body });
}

module.exports = { sendExpoPush, notifyUsers }; 