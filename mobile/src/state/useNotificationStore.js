import { create } from 'zustand';
import { ensureSocket } from '../lib/socket';
import useAuthStore from './useAuthStore';
import api from '../api/client';

function navigateByDeeplink(navigation, deeplink, data = {}) {
  try {
    if (!deeplink) return;
    const url = new URL(deeplink.replace('roomsync://', 'https://roomsync.local/'));
    const parts = url.pathname.split('/').filter(Boolean);
    const [root, second, third] = parts;
    if (root === 'chat' && second === 'conversation' && third) {
      navigation.navigate('Messages', { screen: 'Conversation', params: { conversationId: third } });
    } else if (root === 'chores' && second) {
      navigation.navigate('Chores');
    } else if (root === 'events' && second) {
      navigation.navigate('Events');
    } else if (root === 'expenses' && second) {
      navigation.navigate('Expenses');
    } else if (root === 'marketplace' && second === 'listing' && third) {
      navigation.navigate('Marketplace', { screen: 'ListingDetail', params: { listingId: third } });
    }
  } catch (_) {}
}

const useNotificationStore = create((set, get) => ({
  items: [],
  hasMore: true,
  unreadCount: 0,
  loading: false,
  socketBound: false,

  async hydrate() {
    await Promise.all([get().fetch({ page: 1 }), get().refreshUnreadCount()]);
    get().bindSocket();
  },

  bindSocket() {
    if (get().socketBound) return;
    const { token, user } = useAuthStore.getState();
    const sock = ensureSocket(token);
    if (!sock || !user?.id) return;
    sock.emit('join:user', { userId: user.id });
    sock.on('notification:new', ({ notification }) => {
      const next = [notification, ...get().items];
      set({ items: next });
      if (!notification.readAt) set({ unreadCount: get().unreadCount + 1 });
    });
    set({ socketBound: true });
  },

  async fetch({ page = 1, limit = 20, status = 'all' } = {}) {
    set({ loading: true });
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), status });
      const data = await api.get(`/notifications?${params.toString()}`);
      set({ items: page === 1 ? data : [...get().items, ...data], hasMore: data.length === limit, loading: false });
      return data;
    } catch (e) { set({ loading: false }); throw e; }
  },

  async refreshUnreadCount() {
    try {
      const { count } = await api.get('/notifications/unread_count');
      set({ unreadCount: count || 0 });
      return count || 0;
    } catch (_) { return 0; }
  },

  async markRead(id) {
    try {
      const n = await api.post(`/notifications/${id}/read`);
      set({ items: get().items.map((x) => x.id === id ? n : x), unreadCount: Math.max(0, get().unreadCount - 1) });
      return n;
    } catch (e) { throw e; }
  },

  async markAllRead() {
    await api.post('/notifications/read_all');
    set({ items: get().items.map((x) => ({ ...x, readAt: x.readAt || new Date().toISOString(), status: x.status === 'sent' ? 'read' : x.status })), unreadCount: 0 });
  },

  navigateByDeeplink,
}));

export default useNotificationStore; 