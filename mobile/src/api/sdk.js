import api from './client';

// Resource-scoped SDK the UI must use
export const sdk = {
	chores: {
		async list({ status, groupId } = {}) {
			const params = new URLSearchParams();
			if (status) params.append('status', status);
			if (groupId) params.append('groupId', groupId);
			const path = params.toString() ? `/chores?${params.toString()}` : '/chores';
			return api.get(path);
		},
		async create(payload) {
			return api.post('/chores', payload);
		},
		async update(id, updates) {
			return api.patch(`/chores/${id}`, updates);
		},
		async complete(id) {
			return api.post(`/chores/${id}/complete`);
		},
	},
	events: {
		async list({ groupId } = {}) {
			const path = groupId ? `/events?groupId=${encodeURIComponent(groupId)}` : '/events';
			return api.get(path);
		},
		async create(payload) {
			return api.post('/events', payload);
		},
		async rsvp(eventId, status) {
			return api.post(`/events/${eventId}/rsvp`, { status });
		},
	},
	expenses: {
		async list({ page = 1, limit = 20, groupId } = {}) {
			const params = new URLSearchParams({ page: String(page), limit: String(limit) });
			if (groupId) params.append('groupId', groupId);
			return api.get(`/expenses?${params.toString()}`);
		},
		async balances({ groupId } = {}) {
			const path = groupId ? `/expenses/balances?groupId=${encodeURIComponent(groupId)}` : '/expenses/balances';
			return api.get(path);
		},
		async create(payload) {
			return api.post('/expenses', payload);
		},
		async settle({ fromUserId, toUserId, amount, groupId }) {
			return api.post('/expenses/settle', { fromUserId, toUserId, amount, groupId });
		},
	},
	inventory: {
		async list({ q, groupId } = {}) {
			const params = new URLSearchParams();
			if (q) params.append('q', q);
			if (groupId) params.append('groupId', groupId);
			const path = params.toString() ? `/inventory?${params.toString()}` : '/inventory';
			return api.get(path);
		},
		async create(payload) {
			return api.post('/inventory', payload);
		},
		async update(id, updates) {
			return api.patch(`/inventory/${id}`, updates);
		},
		async remove(id) {
			return api.delete(`/inventory/${id}`);
		},
	},
	listings: {
		async list({ type, q, min, max, category, sort } = {}) {
			const params = new URLSearchParams();
			if (type) params.append('type', type);
			if (q) params.append('q', q);
			if (min != null && min !== '') params.append('min', String(min));
			if (max != null && max !== '') params.append('max', String(max));
			if (category) params.append('category', category);
			if (sort) params.append('sort', sort);
			const path = params.toString() ? `/listings?${params.toString()}` : '/listings';
			return api.get(path);
		},
		async create(payload) { return api.post('/listings', payload); },
		async favorite(id, fav = true) { return api.post(`/listings/${id}/${fav ? 'favorite' : 'unfavorite'}`); },
	},
	locations: {
		async presence(groupId) { return api.get(`/locations/presence?groupId=${encodeURIComponent(groupId)}`); },
		async beacon({ groupId, lat, lng, battery, shareMinutes }) { return api.post('/locations/beacon', { groupId, lat, lng, battery, shareMinutes }); },
	},
	ratings: {
		async avg(placeId) { return api.get(`/ratings/avg?placeId=${encodeURIComponent(placeId)}`); },
		async byPlace(placeId) { return api.get(`/ratings/by-place?placeId=${encodeURIComponent(placeId)}`); },
		async create(payload) { return api.post('/ratings', payload); },
		async remove(id) { return api.delete(`/ratings/${id}`); },
	},
	notifications: {
		async list({ status = 'all', page = 1, limit = 20 } = {}) {
			const params = new URLSearchParams({ status, page: String(page), limit: String(limit) });
			return api.get(`/notifications?${params.toString()}`);
		},
		async unreadCount() { return api.get('/notifications/unread_count'); },
		async markRead(id) { return api.post(`/notifications/${id}/read`); },
		async markAllRead() { return api.post('/notifications/read_all'); },
	},
	prefs: {
		async get() { return api.get('/notification_prefs'); },
		async update(payload) { return api.put('/notification_prefs', payload); },
	},
};

export async function getOrCreateDM(otherUserId) {
  return api.post('/messages/dm/get-or-create', { otherUserId });
}

export async function getOrCreateListingConversation(listingId, sellerId) {
  return api.post('/messages/listing/get-or-create', { listingId, sellerId });
}

export async function listConversations(params = {}) {
  const { page = 1, limit = 20 } = params || {};
  return api.get('/messages/conversations', { params: { page, limit } });
}

export async function listConversationMessages(conversationId, params = {}) {
  const { page = 1, limit = 30 } = params || {};
  return api.get(`/messages/conversations/${conversationId}/messages`, { params: { page, limit } });
}

export async function sendConversationMessage(conversationId, { text, photosBase64 } = {}) {
  return api.post(`/messages/conversations/${conversationId}/messages`, { text, photosBase64 });
}

export async function markConversationRead(conversationId) {
  return api.post(`/messages/conversations/${conversationId}/read`);
}

export const ScheduleAPI = {
	uploadScreenshot: async (image) => {
		const form = new FormData();
		form.append('image', {
			uri: image.uri,
			name: image.fileName || 'schedule.jpg',
			type: image.mimeType || 'image/jpeg',
		});
		return await api.post('/schedule/uploadScreenshot', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 90000 });
	},
	getNext: async () => {
		return await api.get('/schedule/next');
	},
	saveAll: async (events) => {
		return await api.post('/schedule/save', { events });
	},
};

export const NavAPI = {
	getRoute: async ({ originLat, originLng, destLat, destLng }) => {
		const params = new URLSearchParams({ originLat: String(originLat), originLng: String(originLng), destLat: String(destLat), destLng: String(destLng) });
		return await api.get(`/nav/route?${params.toString()}`);
	},
};

export default sdk; 