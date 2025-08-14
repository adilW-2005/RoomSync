import { create } from 'zustand';
import api from '../api/client';

const useExpenseStore = create((set, get) => ({
  expenses: [],
  balances: [],
  loading: false,
  async fetchExpenses({ page = 1, limit = 20 } = {}) {
    set({ loading: true });
    try {
      const res = await api.get(`/expenses?page=${page}&limit=${limit}`);
      set({ expenses: page === 1 ? res.items : [...(get().expenses || []), ...res.items], loading: false });
      return res;
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  async fetchBalances() {
    const b = await api.get('/expenses/balances');
    set({ balances: b });
  },
  async createExpense(payload) {
    const created = await api.post('/expenses', payload);
    set({ expenses: [created, ...(get().expenses || [])] });
    return created;
  }
}));

export default useExpenseStore; 