import { create } from 'zustand';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import api from '../api/client';
import useGroupStore from './useGroupStore';

const TASK_NAME = 'roomsync-location';

// Define the background task once
if (!TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
    try {
      if (error) return;
      const { locations } = data || {};
      if (!locations || locations.length === 0) return;
      const { latitude, longitude } = locations[0].coords || {};
      // Post to backend if groupId available
      // Note: we cannot import store inside task reliably; rely on last stored group id in memory is tricky
      // As a simple approach, send to API only if we can fetch current group id from a persisted endpoint is overkill here.
      // For simplicity, we skip posting from TaskManager and rely on foreground beacon until we wire secure storage bridge.
      return;
    } catch (_) {
      return;
    }
  });
}

const usePresenceStore = create((set, get) => ({
  sharing: false,
  permissionStatus: null,
  async requestPermissions() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    set({ permissionStatus: status });
    return status === 'granted';
  },
  async startSharing() {
    const ok = await get().requestPermissions();
    if (!ok) return false;
    // Optional: request background permission
    try { await Location.requestBackgroundPermissionsAsync(); } catch (_) {}
    set({ sharing: true });
    // Start low-power background updates (if allowed)
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
      if (!hasStarted) {
        await Location.startLocationUpdatesAsync(TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 150000, // ~2.5 min
          distanceInterval: 50, // meters
          pausesUpdatesAutomatically: true,
          showsBackgroundLocationIndicator: false,
          foregroundService: {
            notificationTitle: 'RoomSync UT',
            notificationBody: 'Sharing your location with your group',
          },
        });
      }
    } catch (_) {}
    return true;
  },
  async stopSharing() {
    set({ sharing: false });
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
      if (hasStarted) await Location.stopLocationUpdatesAsync(TASK_NAME);
    } catch (_) {}
    return true;
  },
  async sendForegroundBeacon() {
    const { currentGroup } = useGroupStore.getState();
    if (!currentGroup?.id) return;
    const enabled = get().sharing;
    if (!enabled) return;
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await api.post('/locations/beacon', {
        groupId: currentGroup.id,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    } catch (_) {}
  },
}));

export default usePresenceStore; 