import { create } from 'zustand';
import api from '../api/client';

const useListingStore = create((set, get) => ({
  items: [],
  loading: false,
  filters: { type: '', q: '', min: '', max: '' },
  setFilters(partial) {
    set({ filters: { ...get().filters, ...partial } });
  },
  async fetch() {
    set({ loading: true });
    try {
      const { type, q, min, max } = get().filters;
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (q) params.append('q', q);
      if (min) params.append('min', String(min));
      if (max) params.append('max', String(max));
      const path = params.toString() ? `/listings?${params.toString()}` : '/listings';
      const res = await api.get(path);
      set({ items: res, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
}));

export default useListingStore; 