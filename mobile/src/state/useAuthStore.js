import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAccessToken } from '../api/client';

const STORAGE_KEY = 'roomsync_auth';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  loading: false,
  hydrated: false,
  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { user, token } = JSON.parse(raw);
        if (token) setAccessToken(token);
        set({ user, token, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch (e) {
      set({ hydrated: true });
    }
  },
  async register({ email, password, name, avatarBase64 }) {
    set({ loading: true });
    try {
      const res = await api.post('/auth/register', { email, password, name, avatarBase64 });
      setAccessToken(res.access_token);
      set({ user: res.user, token: res.access_token, loading: false });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: res.user, token: res.access_token }));
      return res;
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  async login({ email, password }) {
    set({ loading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      setAccessToken(res.access_token);
      set({ user: res.user, token: res.access_token, loading: false });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: res.user, token: res.access_token }));
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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: updated, token }));
    return updated;
  },
  async logout() {
    setAccessToken(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ user: null, token: null });
  },
}));

export default useAuthStore; 