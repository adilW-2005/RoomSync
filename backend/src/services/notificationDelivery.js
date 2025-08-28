const Notification = require('../models/Notification');
const { sendPushToUser } = require('./pushAdapter');

async function deliverDue() {
  const now = new Date();
  const due = await Notification.find({ status: { $in: ['queued', 'scheduled'] }, scheduledFor: { $lte: now } }).limit(100);
  for (const n of due) {
    try {
      if (Array.isArray(n.channels) && n.channels.includes('push')) {
        await sendPushToUser(n.userId, { title: n.title, body: n.body, data: { notificationId: String(n._id), deeplink: n.deeplink || null } });
      }
      n.status = 'sent';
      n.sentAt = new Date();
      await n.save();
    } catch (_) {
      n.status = 'failed';
      await n.save();
    }
  }
}

function startScheduler() {
  setInterval(() => {
    deliverDue().catch(() => {});
  }, 60 * 1000);
}

module.exports = { deliverDue, startScheduler }; 