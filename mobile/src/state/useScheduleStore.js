import create from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { ScheduleAPI, NavAPI } from '../api/sdk';

const STORAGE_KEY = 'roomsync_schedule_prefs';

const useScheduleStore = create((set, get) => ({
	nextClass: null,
	etaMinutes: null,
	refreshing: false,
	ui: { showNextCard: true },
	leadTimes: [30, 10], // minutes before start
	scheduledIds: [], // local notification identifiers
	warningLate: false,
	async hydrate() {
		try {
			const raw = await AsyncStorage.getItem(STORAGE_KEY);
			if (raw) {
				const prefs = JSON.parse(raw);
				set({ ui: { ...get().ui, ...prefs.ui }, leadTimes: prefs.leadTimes || get().leadTimes });
			}
		} catch (_) {}
	},
	async savePrefs(partial) {
		const mergedUi = { ...get().ui, ...(partial.ui || partial) };
		const data = { ui: mergedUi, leadTimes: get().leadTimes };
		set({ ui: mergedUi });
		try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}
	},
	async setLeadTimes(leadTimes) {
		set({ leadTimes: Array.from(new Set(leadTimes)).sort((a,b) => a-b) });
		try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ui: get().ui, leadTimes: get().leadTimes })); } catch (_) {}
		await get().rescheduleReminders();
	},
	async refreshNext() {
		set({ refreshing: true });
		try {
			const next = await ScheduleAPI.getNext();
			set({ nextClass: next || null });
			if (next?.location?.lat && next?.location?.lng) {
				const { status } = await Location.requestForegroundPermissionsAsync();
				if (status === 'granted') {
					const pos = await Location.getCurrentPositionAsync({});
					const r = await NavAPI.getRoute({ originLat: pos.coords.latitude, originLng: pos.coords.longitude, destLat: next.location.lat, destLng: next.location.lng });
					const eta = r.etaMinutes ?? null;
					set({ etaMinutes: eta });
					// warning if ETA >= time until class
					try {
						if (eta != null && next?.start_time) {
							const [h, m] = String(next.start_time).split(':').map((x) => parseInt(x, 10));
							const start = new Date(); start.setHours(h, m, 0, 0);
							const minsUntil = Math.max(0, Math.floor((start.getTime() - Date.now()) / 60000));
							set({ warningLate: eta >= minsUntil });
						}
					} catch (_) { set({ warningLate: false }); }
				}
			}
			await get().rescheduleReminders();
		} catch (_) { set({ etaMinutes: null, warningLate: false }); }
		finally { set({ refreshing: false }); }
	},
	async rescheduleReminders() {
		try {
			// cancel existing
			const ids = get().scheduledIds || [];
			for (const id of ids) { try { await Notifications.cancelScheduledNotificationAsync(id); } catch (_) {} }
			set({ scheduledIds: [] });
			const next = get().nextClass;
			if (!next?.start_time) return;
			const [h, m] = String(next.start_time).split(':').map((x) => parseInt(x, 10));
			const start = new Date(); start.setHours(h, m, 0, 0);
			// schedule per lead time
			const newIds = [];
			for (const mins of get().leadTimes) {
				const fireAt = new Date(start.getTime() - mins * 60000);
				if (fireAt.getTime() <= Date.now()) continue;
				try {
					const id = await Notifications.scheduleNotificationAsync({
						content: { title: 'Class reminder', body: `${next.course} at ${next.start_time} in ${next.building} ${next.room || ''}` },
						trigger: { date: fireAt },
					});
					newIds.push(id);
				} catch (_) {}
			}
			set({ scheduledIds: newIds });
		} catch (_) {}
	},
}));

export default useScheduleStore; 