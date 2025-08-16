import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAccessToken } from '../api/client';

const STORAGE_KEY = 'roomsync_auth';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  loading: false,
  hydrated: false,
  firstRun: true,
  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { user, token, firstRun } = JSON.parse(raw);
        if (token) setAccessToken(token);
        set({ user, token, hydrated: true, firstRun: firstRun !== false });
      } else {
        set({ hydrated: true, firstRun: true });
      }
    } catch (e) {
      set({ hydrated: true, firstRun: true });
    }
  },
  async register({ email, password, name, avatarBase64, username, pushToken }) {
    set({ loading: true });
    try {
      const res = await api.post('/auth/register', { email, password, name, avatarBase64, username });
      setAccessToken(res.access_token);
      if (pushToken) { try { await api.post('/users/me/push-token', { token: pushToken }); } catch (_) {} }
      set({ user: res.user, token: res.access_token, loading: false });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: res.user, token: res.access_token, firstRun: true }));
      return res;
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  async login({ email, password, pushToken }) {
    set({ loading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      setAccessToken(res.access_token);
      if (pushToken) { try { await api.post('/users/me/push-token', { token: pushToken }); } catch (_) {} }
      set({ user: res.user, token: res.access_token, loading: false });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: res.user, token: res.access_token, firstRun: false }));
      return res;
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  async updateProfile(payload) {
    const updated = await api.patch('/users/me', payload);
    set({ user: updated });
    const token = get().token;
    const firstRun = get().firstRun;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: updated, token, firstRun }));
    return updated;
  },
  async dismissFirstRun() {
    const token = get().token;
    const user = get().user;
    set({ firstRun: false });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token, firstRun: false }));
  },
  async deleteAccount() {
    await api.delete('/users/me');
    setAccessToken(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ user: null, token: null, firstRun: true });
  },
  async logout() {
    setAccessToken(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ user: null, token: null, firstRun: true });
  },
}));

export default useAuthStore; 