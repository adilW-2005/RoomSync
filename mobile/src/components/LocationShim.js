import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

let ExpoLocation;
if (!isWeb) {
  // eslint-disable-next-line global-require
  ExpoLocation = require('expo-location');
}

// Mock location for web (Austin, TX area)
const mockLocation = {
  coords: {
    latitude: 30.2849,
    longitude: -97.7341,
    altitude: 0,
    accuracy: 100,
    heading: 0,
    speed: 0,
  },
  timestamp: Date.now(),
};

export const requestForegroundPermissionsAsync = async () => {
  if (isWeb) {
    return { status: 'granted' };
  }
  return ExpoLocation.requestForegroundPermissionsAsync();
};

export const requestBackgroundPermissionsAsync = async () => {
  if (isWeb) {
    return { status: 'granted' };
  }
  return ExpoLocation.requestBackgroundPermissionsAsync();
};

export const getCurrentPositionAsync = async (options = {}) => {
  if (isWeb) {
    // Try to use browser geolocation if available
    if (navigator.geolocation) {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                altitude: position.coords.altitude || 0,
                accuracy: position.coords.accuracy || 100,
                heading: position.coords.heading || 0,
                speed: position.coords.speed || 0,
              },
              timestamp: position.timestamp,
            });
          },
          () => {
            // Fallback to mock location if geolocation fails
            resolve(mockLocation);
          },
          { timeout: 5000, ...options }
        );
      });
    }
    // Fallback to mock location
    return mockLocation;
  }
  return ExpoLocation.getCurrentPositionAsync(options);
};

export const watchPositionAsync = async (options, callback) => {
  if (isWeb) {
    // Return a mock subscription
    return {
      remove: () => {},
    };
  }
  return ExpoLocation.watchPositionAsync(options, callback);
};

export const startLocationUpdatesAsync = async (taskName, options) => {
  if (isWeb) {
    // No-op for web
    return;
  }
  return ExpoLocation.startLocationUpdatesAsync(taskName, options);
};

export const stopLocationUpdatesAsync = async (taskName) => {
  if (isWeb) {
    // No-op for web
    return;
  }
  return ExpoLocation.stopLocationUpdatesAsync(taskName);
};

// Export accuracy constants
export const Accuracy = isWeb ? {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
} : ExpoLocation.Accuracy; 