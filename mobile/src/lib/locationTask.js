import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import api from '../api/client';
import useGroupStore from '../state/useGroupStore';

export const LOCATION_TASK = 'roomsync-location-task';

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  try {
    if (error) return;
    const { locations } = data || {};
    const latest = locations && locations[0];
    if (!latest) return;
    const { latitude, longitude } = latest.coords || {};
    const state = useGroupStore.getState();
    const groupId = state.currentGroup?.id;
    if (!groupId) return;
    await api.post('/locations/beacon', { groupId, lat: latitude, lng: longitude });
  } catch (_) {
    // best effort
  }
});

export async function startBackgroundUpdates() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') return false;
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
  if (!isRegistered) {
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 180000,
      distanceInterval: 30,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'RoomSync Location',
        notificationBody: 'Sharing your location with roommates',
      },
    });
  }
  return true;
}

export async function stopBackgroundUpdates() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
} 