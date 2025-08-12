import { create } from 'zustand';
import api from '../api/client';

const useEventStore = create((set, get) => ({
  events: [],
  loading: false,
  async fetchEvents() {
    set({ loading: true });
    try {
      const items = await api.get('/events');
      set({ events: items, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  async createEvent(payload) {
    const created = await api.post('/events', payload);
    set({ events: [created, ...(get().events || [])] });
    return created;
  }
}));

export default useEventStore; 