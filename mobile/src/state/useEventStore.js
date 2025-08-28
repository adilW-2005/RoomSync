import { create } from 'zustand';
import { sdk } from '../api/sdk';

const useEventStore = create((set, get) => ({
  events: [],
  loading: false,
  async fetchEvents() {
    set({ loading: true });
    try {
      const items = await sdk.events.list();
      set({ events: items, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  async createEvent(payload) {
    const created = await sdk.events.create(payload);
    set({ events: [created, ...(get().events || [])] });
    return created;
  }
}));

export default useEventStore; 