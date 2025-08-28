import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from '../api/client';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Location from 'expo-location';

export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function registerForPushToken() {
  try {
    const perms = await requestNotificationPermissions();
    if (!perms) return null;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: Constants?.expoConfig?.extra?.eas?.projectId || undefined });
    const token = tokenData?.data;
    if (token) {
      await api.post('/devices', { token, platform: 'expo' }).catch(() => {});
    }
    return token;
  } catch (_) { return null; }
}

export function bindNotificationResponseListener(navigation) {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    try {
      const deeplink = response?.notification?.request?.content?.data?.deeplink;
      if (deeplink) {
        // naive parse for conversation
        const path = String(deeplink).replace('roomsync://', '');
        const parts = path.split('/');
        if (parts[0] === 'chat' && parts[1] === 'conversation' && parts[2]) {
          navigation.navigate('Messages', { screen: 'Conversation', params: { conversationId: parts[2] } });
        }
      }
    } catch (_) {}
  });
  return () => sub.remove();
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

const SCHEDULE_TASK = 'roomsync-schedule-poll';

TaskManager.defineTask(SCHEDULE_TASK, async () => {
  try {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 7 || hour > 19) return BackgroundFetch.BackgroundFetchResult.NoData;
    const next = await api.get('/schedule/next');
    if (!next?.location?.lat) return BackgroundFetch.BackgroundFetchResult.NoData;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return BackgroundFetch.BackgroundFetchResult.NoData;
    const pos = await Location.getCurrentPositionAsync({});
    const r = await api.get(`/nav/route?originLat=${pos.coords.latitude}&originLng=${pos.coords.longitude}&destLat=${next.location.lat}&destLng=${next.location.lng}`);
    const etaMin = r?.etaMinutes ?? null;
    if (etaMin == null) return BackgroundFetch.BackgroundFetchResult.NoData;
    const [h, m] = String(next.start_time || '').split(':').map((x) => parseInt(x, 10));
    if (isNaN(h) || isNaN(m)) return BackgroundFetch.BackgroundFetchResult.NoData;
    const classStart = new Date(); classStart.setHours(h, m, 0, 0);
    const buffer = 2; // minutes cushion
    const leaveBy = new Date(classStart.getTime() - (etaMin + buffer) * 60000);
    if (Date.now() >= leaveBy.getTime() && Date.now() < classStart.getTime()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Leave now',
          body: `Leave now for ${next.building} ${next.room || ''} (${etaMin} min walk)`,
        },
        trigger: null,
      });
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }
    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (_) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function startSchedulePolling() {
  try {
    await BackgroundFetch.registerTaskAsync(SCHEDULE_TASK, { minimumInterval: 600 });
    return true;
  } catch (_) { return false; }
} 