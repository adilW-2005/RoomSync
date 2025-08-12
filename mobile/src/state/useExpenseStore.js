import { create } from 'zustand';
import api from '../api/client';

const useExpenseStore = create((set, get) => ({
  expenses: [],
  balances: [],
  loading: false,
  async fetchExpenses() {
    set({ loading: true });
    try {
      const items = await api.get('/expenses');
      set({ expenses: items, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  async fetchBalances() {
    const b = await api.get('/balances');
    set({ balances: b });
  },
  async createExpense(payload) {
    const created = await api.post('/expenses', payload);
    set({ expenses: [created, ...(get().expenses || [])] });
    return created;
  }
}));

export default useExpenseStore; 