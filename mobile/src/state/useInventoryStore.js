import { create } from 'zustand';
import api from '../api/client';

const useInventoryStore = create((set, get) => ({
  items: [],
  loading: false,
  async fetchItems() {
    set({ loading: true });
    try {
      const items = await api.get('/inventory');
      set({ items, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  async createItem(payload) {
    const created = await api.post('/inventory', payload);
    set({ items: [created, ...(get().items || [])] });
    return created;
  },
  async updateItem(id, updates) {
    const updated = await api.patch(`/inventory/${id}`, updates);
    set({ items: (get().items || []).map((i) => (i.id === id ? updated : i)) });
    return updated;
  },
}));

export default useInventoryStore; 