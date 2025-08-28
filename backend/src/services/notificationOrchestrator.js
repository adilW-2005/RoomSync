const Notification = require('../models/Notification');
const UserNotificationPrefs = require('../models/UserNotificationPrefs');
const { tryGetIO } = require('../socket');
const { sendPushToUser } = require('./pushAdapter');

function withinQuietHours(now, quiet) {
  try {
    if (!quiet || !quiet.start || !quiet.end) return false;
    // Interpret HH:mm in user's tz is complex; approximate using local time
    const [sh, sm] = String(quiet.start).split(':').map((v) => Number(v));
    const [eh, em] = String(quiet.end).split(':').map((v) => Number(v));
    const start = new Date(now); start.setHours(sh || 0, sm || 0, 0, 0);
    const end = new Date(now); end.setHours(eh || 0, em || 0, 0, 0);
    if (end <= start) {
      // wraps past midnight
      return now >= start || now <= end;
    }
    return now >= start && now <= end;
  } catch (_) { return false; }
}

function inferCategory(type) {
  if (type.startsWith('chat.')) return 'chat';
  if (type.startsWith('chore.')) return 'chores';
  if (type.startsWith('event.')) return 'events';
  if (type.startsWith('expense.')) return 'expenses';
  if (type.startsWith('marketplace.')) return 'marketplace';
  return 'system';
}

async function handle(event) {
  // event: { type, userIdTargets: [], title, body, data, deeplink, priority, idempotencyKey }
  const now = new Date();
  const category = inferCategory(event.type || 'system');
  const results = [];
  for (const userId of event.userIdTargets || []) {
    const prefs = await UserNotificationPrefs.findOne({ userId }) || new UserNotificationPrefs({ userId });
    const categoryAllowed = prefs.categories?.[category] !== false;
    const channels = prefs.channels || { push: true, inapp: true };
    const quiet = withinQuietHours(now, prefs.quietHours);

    if (!categoryAllowed) continue;

    const channelsArr = Object.entries(channels).filter(([, enabled]) => enabled).map(([k]) => k);
    const scheduledFor = quiet && event.priority !== 'high' ? new Date(now.getTime() + 60 * 60 * 1000) : now; // simple defer 1h during quiet hours

    const notif = await Notification.create({
      userId,
      type: event.type,
      category,
      title: event.title,
      body: event.body,
      data: event.data || {},
      deeplink: event.deeplink,
      channels: channelsArr,
      status: 'queued',
      priority: event.priority || 'normal',
      scheduledFor,
      idempotencyKey: event.idempotencyKey || undefined,
    });

    // Realtime in-app feed update
    const io = tryGetIO();
    if (io) io.to(String(userId)).emit('notification:new', { notification: notif.toJSON() });

    // Immediate delivery only if not scheduled in future
    if (!quiet || event.priority === 'high') {
      try {
        if (channels.push) {
          await sendPushToUser(userId, { title: notif.title, body: notif.body, data: { notificationId: String(notif._id), deeplink: notif.deeplink || null } });
        }
        notif.status = 'sent';
        notif.sentAt = new Date();
        await notif.save();
      } catch (e) {
        notif.status = 'failed';
        await notif.save();
      }
    }

    results.push(notif);
  }
  return results;
}

module.exports = { handle }; 