import * as Notifications from 'expo-notifications';

export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleChoreReminder({ title, dueAt }) {
  try {
    const fireDate = new Date(dueAt).getTime() - 60 * 60 * 1000; // 1h before
    if (fireDate <= Date.now()) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Chore due soon',
        body: `${title} is due in ~1 hour`,
      },
      trigger: { date: new Date(fireDate) },
    });
  } catch (_) { return null; }
}

export async function scheduleEventReminder({ title, startAt }) {
  try {
    const fireDate = new Date(startAt).getTime() - 10 * 60 * 1000; // 10m before
    if (fireDate <= Date.now()) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Event starting soon',
        body: `${title} starts in ~10 minutes`,
      },
      trigger: { date: new Date(fireDate) },
    });
  } catch (_) { return null; }
}

export async function scheduleEventReminderOneHour({ title, startAt }) {
  try {
    const fireDate = new Date(startAt).getTime() - 60 * 60 * 1000; // 1h before
    if (fireDate <= Date.now()) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Event coming up',
        body: `${title} starts in ~1 hour`,
      },
      trigger: { date: new Date(fireDate) },
    });
  } catch (_) { return null; }
}

export async function notifyHangoutProposal({ title, time, loc }) {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'New Hangout Proposal',
        body: `${title}${time ? ' · ' + time : ''}${loc ? ' · ' + loc : ''}`,
      },
      trigger: null,
    });
  } catch (_) { return null; }
}

export async function notifyHangoutResult({ title, result }) {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Hangout Result',
        body: `${title}: ${result}`,
      },
      trigger: null,
    });
  } catch (_) { return null; }
} 