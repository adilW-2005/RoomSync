import { create } from 'zustand';
import api from '../api/client';

const useInventoryStore = create((set, get) => ({
  items: [],
  loading: false,
  async fetchItems({ q } = {}) {
    set({ loading: true });
    try {
      const url = q ? `/inventory?q=${encodeURIComponent(q)}` : '/inventory';
      const items = await api.get(url);
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
  async deleteItem(id) {
    await api.delete(`/inventory/${id}`);
    set({ items: (get().items || []).filter((i) => i.id !== id) });
  }
}));

export default useInventoryStore; 