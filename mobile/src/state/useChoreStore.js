import { create } from 'zustand';
import api from '../api/client';

const useChoreStore = create((set, get) => ({
	openChores: [],
	doneChores: [],
	loading: false,
	async fetchOpen() {
		set({ loading: true });
		try {
			const chores = await api.get('/chores?status=open');
			set({ openChores: chores, loading: false });
		} catch (e) {
			set({ loading: false });
			throw e;
		}
	},
	async fetchDone() {
		try {
			const chores = await api.get('/chores?status=done');
			set({ doneChores: chores });
		} catch (e) {
			/* ignore */
		}
	},
	async completeChore(id) {
		await api.post(`/chores/${id}/complete`);
		const next = (get().openChores || []).filter(c => c.id !== id);
		set({ openChores: next });
	},
	async createChore(payload) {
		const created = await api.post('/chores', payload);
		set({ openChores: [...(get().openChores || []), created] });
		return created;
	},
	async updateChore(id, updates) {
		const updated = await api.patch(`/chores/${id}`, updates);
		let list = (get().openChores || []).map(c => (c.id === id ? { ...c, ...updated } : c));
		if (updated.status === 'done') {
			list = list.filter(c => c.id !== id);
		}
		set({ openChores: list });
		return updated;
	}
}));

export default useChoreStore; 