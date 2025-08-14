import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const STORAGE_KEY = 'roomsync_group';

const useGroupStore = create((set, get) => ({
  currentGroup: null,
  hydrated: false,
  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const g = JSON.parse(raw);
        set({ currentGroup: g, hydrated: true });
      } else set({ hydrated: true });
    } catch (_) {
      set({ hydrated: true });
    }
  },
  async createGroup(name) {
    const group = await api.post('/groups', { name });
    set({ currentGroup: group });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(group));
    return group;
  },
  async joinGroup(code) {
    const group = await api.post('/groups/join', { code });
    set({ currentGroup: group });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(group));
    return group;
  },
  async getCurrent() {
    const group = await api.get('/groups/current');
    set({ currentGroup: group });
    if (group) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(group));
    return group;
  },
  async rename(name) {
    const group = await api.patch('/groups/current', { name });
    set({ currentGroup: group });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(group));
    return group;
  },
  async regenerateCode() {
    const group = await api.post('/groups/current/regenerate-code');
    set({ currentGroup: group });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(group));
    return group;
  },
  async removeMember(userId) {
    const group = await api.post('/groups/current/remove-member', { userId });
    set({ currentGroup: group });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(group));
    return group;
  }
}));

export default useGroupStore; 