import { create } from 'zustand';
import { sdk } from '../api/sdk';

const useChoreStore = create((set, get) => ({
	openChores: [],
	doneChores: [],
	loading: false,
	async fetchOpen() {
		set({ loading: true });
		try {
			const chores = await sdk.chores.list({ status: 'open' });
			set({ openChores: chores, loading: false });
		} catch (e) {
			set({ loading: false });
			throw e;
		}
	},
	async fetchDone() {
		try {
			const chores = await sdk.chores.list({ status: 'done' });
			set({ doneChores: chores });
		} catch (e) {
			/* ignore */
		}
	},
	async completeChore(id) {
		await sdk.chores.complete(id);
		const next = (get().openChores || []).filter(c => c.id !== id);
		set({ openChores: next });
	},
	async createChore(payload) {
		const created = await sdk.chores.create(payload);
		set({ openChores: [...(get().openChores || []), created] });
		return created;
	},
	async updateChore(id, updates) {
		const updated = await sdk.chores.update(id, updates);
		let list = (get().openChores || []).map(c => (c.id === id ? { ...c, ...updated } : c));
		if (updated.status === 'done') {
			list = list.filter(c => c.id !== id);
		}
		set({ openChores: list });
		return updated;
	}
}));

export default useChoreStore; 