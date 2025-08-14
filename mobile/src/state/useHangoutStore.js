import { create } from 'zustand';
import { getSocket } from '../lib/socket';

const useHangoutStore = create((set, get) => ({
  proposals: [], // [{ id, title, time, authorId, desc?, loc?, votes: { [userId]: 'yes'|'no' } }]
  addProposal(p) {
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
    socket?.emit('hangout:proposal', payload);
    // Optimistic update
    set({ proposals: [payload, ...get().proposals] });
  },
  vote({ proposalId, userId, groupId, vote }) {
    const socket = getSocket();
    const payload = { proposalId, userId, groupId, vote };
    socket?.emit('hangout:vote', payload);
    // Optimistic update
    get().applyVote(payload);
  },
}));

export default useHangoutStore; 