import { create } from 'zustand';
import { ensureSocket, getSocket } from '../lib/socket';
import useAuthStore from './useAuthStore';
import { listConversations, listConversationMessages, sendConversationMessage, markConversationRead, getOrCreateDM, getOrCreateListingConversation } from '../api/sdk';

const useMessageStore = create((set, get) => ({
  conversations: [],
  messagesByConvId: {},
  hasMoreByConvId: {},
  loading: false,
  unreadTotal: 0,
  socketBound: false,

  async hydrate() {
    await get().fetchConversations();
    get().bindSocket();
  },

  bindSocket() {
    if (get().socketBound) return;
    const { token, user } = useAuthStore.getState();
    const sock = ensureSocket(token);
    if (!sock || !user?.id) return;
    sock.emit('join:user', { userId: user.id });
    // Guard against duplicate handlers in Fast Refresh
    try { sock.off && sock.off('dm:message'); sock.off && sock.off('dm:read'); } catch (_) {}
    sock.on('dm:message', ({ conversationId, message }) => {
      const state = get();
      const msgs = state.messagesByConvId[conversationId] || [];
      // Dedupe by server id
      if (msgs.find((m) => String(m.id) === String(message.id))) return;
      // If an optimistic message from self exists, replace it instead of appending
      const viewerId = user.id;
      const optimisticIdx = msgs.findIndex((m) => m.optimistic && String(m.fromUserId) === String(message.fromUserId) && (m.text || '') === (message.text || ''));
      let nextMsgs;
      if (optimisticIdx >= 0) {
        nextMsgs = msgs.slice();
        nextMsgs[optimisticIdx] = message;
      } else {
        nextMsgs = [message, ...msgs];
      }
      set({ messagesByConvId: { ...state.messagesByConvId, [conversationId]: nextMsgs } });
      // bump conversation and unread
      const convs = state.conversations.slice();
      const idx = convs.findIndex((c) => c.id === conversationId);
      if (idx >= 0) {
        const conv = { ...convs[idx] };
        conv.lastMessage = { text: message.text, photos: message.photos, fromUserId: message.fromUserId, createdAt: message.createdAt };
        conv.updatedAt = message.createdAt;
        if (String(message.fromUserId) !== String(viewerId)) {
          conv.participants = conv.participants.map((p) => String(p.userId) === String(viewerId) ? p : { ...p, unreadCount: (p.unreadCount || 0) + 1 });
        }
        convs.splice(idx, 1);
        convs.unshift(conv);
        set({ conversations: convs });
        get().recalcUnreadTotal();
      }
    });
    sock.on('dm:read', ({ conversationId, userId }) => {
      const convs = get().conversations.slice();
      const idx = convs.findIndex((c) => c.id === conversationId);
      if (idx >= 0) {
        const conv = { ...convs[idx] };
        conv.participants = conv.participants.map((p) => String(p.userId) === String(userId) ? { ...p, unreadCount: 0, lastReadAt: new Date().toISOString() } : p);
        convs[idx] = conv;
        set({ conversations: convs });
      }
    });
    set({ socketBound: true });
  },

  async fetchConversations(params = { page: 1, limit: 20 }) {
    set({ loading: true });
    try {
      const convs = await listConversations(params);
      set({ conversations: params.page === 1 ? convs : [...get().conversations, ...convs], loading: false });
      get().recalcUnreadTotal();
      return convs;
    } catch (e) { set({ loading: false }); throw e; }
  },

  async openOrCreateDM(otherUserId) {
    const conv = await getOrCreateDM(otherUserId);
    await get().ensureMessagesLoaded(conv.id);
    return conv;
  },

  async openOrCreateListing(listingId, sellerId) {
    const conv = await getOrCreateListingConversation(listingId, sellerId);
    await get().ensureMessagesLoaded(conv.id);
    return conv;
  },

  async ensureMessagesLoaded(conversationId) {
    const state = get();
    if (!state.messagesByConvId[conversationId]) {
      const msgs = await listConversationMessages(conversationId, { page: 1, limit: 30 });
      set({ messagesByConvId: { ...state.messagesByConvId, [conversationId]: msgs }, hasMoreByConvId: { ...state.hasMoreByConvId, [conversationId]: msgs.length === 30 } });
    }
  },

  async fetchMore(conversationId) {
    const msgs = get().messagesByConvId[conversationId] || [];
    const page = Math.floor(msgs.length / 30) + 1;
    const next = await listConversationMessages(conversationId, { page, limit: 30 });
    set({ messagesByConvId: { ...get().messagesByConvId, [conversationId]: [...msgs, ...next] }, hasMoreByConvId: { ...get().hasMoreByConvId, [conversationId]: next.length === 30 } });
  },

  async send(conversationId, { text, photosBase64 } = {}) {
    const optimistic = {
      id: `local-${Date.now()}`,
      conversationId,
      text: text || '',
      photos: [],
      fromUserId: useAuthStore.getState().user?.id,
      toUserId: '',
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    const msgs = get().messagesByConvId[conversationId] || [];
    set({ messagesByConvId: { ...get().messagesByConvId, [conversationId]: [optimistic, ...msgs] } });
    try {
      const { message, conversation } = await sendConversationMessage(conversationId, { text, photosBase64 });
      const current = get().messagesByConvId[conversationId] || [];
      const serverAlready = current.some((m) => String(m.id) === String(message.id));
      let updatedMsgs;
      if (serverAlready) {
        // Remove leftover optimistic if socket already inserted server message
        updatedMsgs = current.filter((m) => m.id !== optimistic.id);
      } else {
        // Replace optimistic with server message
        updatedMsgs = current.map((m) => m.id === optimistic.id ? message : m);
      }
      set({ messagesByConvId: { ...get().messagesByConvId, [conversationId]: updatedMsgs }, conversations: get().conversations.map((c) => c.id === conversation.id ? conversation : c) });
      get().recalcUnreadTotal();
      return message;
    } catch (e) {
      // remove optimistic on failure
      const updated = (get().messagesByConvId[conversationId] || []).filter((m) => m.id !== optimistic.id);
      set({ messagesByConvId: { ...get().messagesByConvId, [conversationId]: updated } });
      throw e;
    }
  },

  async markRead(conversationId) {
    const conv = await markConversationRead(conversationId);
    set({ conversations: get().conversations.map((c) => c.id === conversationId ? conv : c) });
    get().recalcUnreadTotal();
    return conv;
  },

  recalcUnreadTotal() {
    const { conversations } = get();
    const myId = useAuthStore.getState().user?.id;
    const total = conversations.reduce((sum, c) => {
      const you = c.participants.find((p) => String(p.userId) === String(myId));
      return sum + (you?.unreadCount || 0);
    }, 0);
    set({ unreadTotal: total });
  },
}));

export default useMessageStore; 