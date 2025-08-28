import { create } from 'zustand';
import { sdk } from '../api/sdk';

const useListingStore = create((set, get) => ({
  items: [],
  loading: false,
  filters: { type: '', q: '', min: '', max: '' },
  setFilters(partial) {
    set({ filters: { ...get().filters, ...partial } });
  },
  optimisticFavorite(id, fav) {
    const next = (get().items || []).map((it) => (String(it.id) === String(id) ? { ...it, isFavorited: fav } : it));
    set({ items: next });
  },
  async fetch() {
    set({ loading: true });
    try {
      const { type, q, min, max } = get().filters;
      const res = await sdk.listings.list({ type, q, min, max });
      set({ items: res, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
}));

export default useListingStore; 