const presenceByGroup = new Map(); // groupId -> Map(userId, { lat, lng, updatedAt })

function updatePresence(groupId, userId, lat, lng, updatedAt = new Date()) {
  const gid = String(groupId);
  const uid = String(userId);
  let groupMap = presenceByGroup.get(gid);
  if (!groupMap) {
    groupMap = new Map();
    presenceByGroup.set(gid, groupMap);
  }
  groupMap.set(uid, { lat: Number(lat), lng: Number(lng), updatedAt: new Date(updatedAt) });
}

function getGroupPresence(groupId) {
  const gid = String(groupId);
  const groupMap = presenceByGroup.get(gid) || new Map();
  return Array.from(groupMap.entries()).map(([userId, v]) => ({ userId, groupId: gid, ...v }));
}

function pruneStale(ttlMs = 10 * 60 * 1000) {
  const now = Date.now();
  for (const [gid, groupMap] of presenceByGroup.entries()) {
    for (const [uid, rec] of groupMap.entries()) {
      if (now - new Date(rec.updatedAt).getTime() > ttlMs) {
        groupMap.delete(uid);
      }
    }
    if (groupMap.size === 0) presenceByGroup.delete(gid);
  }
}

module.exports = { updatePresence, getGroupPresence, pruneStale }; 