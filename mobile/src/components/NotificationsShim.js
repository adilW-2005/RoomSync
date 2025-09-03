import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

let ExpoNotifications;
if (!isWeb) {
  // eslint-disable-next-line global-require
  ExpoNotifications = require('expo-notifications');
}

export const requestPermissionsAsync = async () => {
  if (isWeb) {
    // Try to use browser notifications if available
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return {
        status: permission === 'granted' ? 'granted' : 'denied',
        granted: permission === 'granted',
      };
    }
    return { status: 'granted', granted: true };
  }
  return ExpoNotifications.requestPermissionsAsync();
};

export const getPermissionsAsync = async () => {
  if (isWeb) {
    if ('Notification' in window) {
      return {
        status: Notification.permission === 'granted' ? 'granted' : 'denied',
        granted: Notification.permission === 'granted',
      };
    }
    return { status: 'granted', granted: true };
  }
  return ExpoNotifications.getPermissionsAsync();
};

export const scheduleNotificationAsync = async (content, trigger) => {
  if (isWeb) {
    // Use browser notifications if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(content.title || 'RoomSync', {
        body: content.body,
        icon: '/favicon.ico',
      });
    }
    return 'web-notification-id';
  }
  return ExpoNotifications.scheduleNotificationAsync(content, trigger);
};

export const cancelScheduledNotificationAsync = async (identifier) => {
  if (isWeb) {
    // No-op for web
    return;
  }
  return ExpoNotifications.cancelScheduledNotificationAsync(identifier);
};

export const cancelAllScheduledNotificationsAsync = async () => {
  if (isWeb) {
    // No-op for web
    return;
  }
  return ExpoNotifications.cancelAllScheduledNotificationsAsync();
};

export const addNotificationReceivedListener = (listener) => {
  if (isWeb) {
    // Return mock subscription
    return { remove: () => {} };
  }
  return ExpoNotifications.addNotificationReceivedListener(listener);
};

export const addNotificationResponseReceivedListener = (listener) => {
  if (isWeb) {
    // Return mock subscription
    return { remove: () => {} };
  }
  return ExpoNotifications.addNotificationResponseReceivedListener(listener);
};

export const setNotificationHandler = (handler) => {
  if (isWeb) {
    // No-op for web
    return;
  }
  return ExpoNotifications.setNotificationHandler(handler);
};

// Export constants
export const AndroidImportance = isWeb ? {
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
  MAX: 5,
} : ExpoNotifications.AndroidImportance; 