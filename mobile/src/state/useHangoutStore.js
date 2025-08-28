import { create } from 'zustand';
import { getSocket } from '../lib/socket';

const useHangoutStore = create((set, get) => ({
  proposals: [], // [{ id, title, time, authorId, desc?, loc?, votes: { [userId]: 'yes'|'no' } }]
  addProposal(p) {
    const exists = get().proposals.some((x) => x.id === p.id);
    if (exists) return; // dedupe
    set({ proposals: [p, ...get().proposals] });
  },
  applyVote({ proposalId, userId, vote }) {
    set({
      proposals: get().proposals.map((p) => {
        if (p.id !== proposalId) return p;
        const votes = { ...(p.votes || {}) };
        votes[userId] = vote;
        return { ...p, votes };
      }),
    });
  },
  propose({ title, time, authorId, groupId, desc, loc }) {
    const socket = getSocket();
    const payload = { id: `${Date.now()}`, title, time, authorId, groupId, desc, loc, votes: {} };
    // Optimistic add first
    const exists = get().proposals.some((x) => x.id === payload.id);
    if (!exists) set({ proposals: [payload, ...get().proposals] });
    socket?.emit('hangout:proposal', payload);
  },
  vote({ proposalId, userId, groupId, vote }) {
    const socket = getSocket();
    const payload = { proposalId, userId, groupId, vote };
    // Optimistic apply first (idempotent)
    get().applyVote(payload);
    socket?.emit('hangout:vote', payload);
  },
}));

export default useHangoutStore; 