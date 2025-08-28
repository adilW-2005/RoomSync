import { create } from 'zustand';
import { sdk } from '../api/sdk';

const useInventoryStore = create((set, get) => ({
  items: [],
  loading: false,
  async fetchItems({ q } = {}) {
    set({ loading: true });
    try {
      const items = await sdk.inventory.list({ q });
      set({ items, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  async createItem(payload) {
    const created = await sdk.inventory.create(payload);
    set({ items: [created, ...(get().items || [])] });
    return created;
  },
  async updateItem(id, updates) {
    const updated = await sdk.inventory.update(id, updates);
    set({ items: (get().items || []).map((i) => (i.id === id ? updated : i)) });
    return updated;
  },
  async deleteItem(id) {
    await sdk.inventory.remove(id);
    set({ items: (get().items || []).filter((i) => i.id !== id) });
  }
}));

export default useInventoryStore; 