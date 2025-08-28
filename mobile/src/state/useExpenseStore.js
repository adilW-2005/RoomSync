import { create } from 'zustand';
import { sdk } from '../api/sdk';

const useExpenseStore = create((set, get) => ({
  expenses: [],
  balances: [],
  loading: false,
  async fetchExpenses({ page = 1, limit = 20 } = {}) {
    set({ loading: true });
    try {
      const res = await sdk.expenses.list({ page, limit });
      set({ expenses: page === 1 ? res.items : [...(get().expenses || []), ...res.items], loading: false });
      return res;
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  async fetchBalances() {
    const b = await sdk.expenses.balances();
    set({ balances: b });
  },
  async createExpense(payload) {
    const created = await sdk.expenses.create(payload);
    set({ expenses: [created, ...(get().expenses || [])] });
    return created;
  }
}));

export default useExpenseStore; 