import { create } from 'zustand';
import api from '../api/client';

const useChoreStore = create((set, get) => ({
  openChores: [],
  loading: false,
  async fetchOpen() {
    set({ loading: true });
    try {
      const chores = await api.get('/chores?status=open');
      set({ openChores: chores, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  async completeChore(id) {
    await api.post(`/chores/${id}/complete`);
    const next = (get().openChores || []).filter(c => c.id !== id);
    set({ openChores: next });
  },
  async createChore(payload) {
    const created = await api.post('/chores', payload);
    set({ openChores: [...(get().openChores || []), created] });
    return created;
  }
}));

export default useChoreStore; 