import { create } from 'zustand';
import api from '../api/client';

const useMemberStore = create((set, get) => ({
  membersById: {},
  loading: false,
  async fetchCurrentGroupMembers() {
    set({ loading: true });
    try {
      const group = await api.get('/groups/current');
      const map = {};
      (group?.members || []).forEach((m) => {
        map[m.id] = m.name || m.email || m.id;
      });
      set({ membersById: map, loading: false });
      return map;
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  }
}));

export default useMemberStore; 