const presenceByGroup = new Map(); // groupId -> Map(userId, { lat, lng, updatedAt, battery, shareUntil })
const homeByGroup = new Map(); // groupId -> { lat, lng, radiusMeters }

function updatePresence(groupId, userId, lat, lng, updatedAt = new Date(), battery, shareUntil) {
  const gid = String(groupId);
  const uid = String(userId);
  let groupMap = presenceByGroup.get(gid);
  if (!groupMap) {
    groupMap = new Map();
    presenceByGroup.set(gid, groupMap);
  }
  const prev = groupMap.get(uid);
  const rec = { lat: Number(lat), lng: Number(lng), updatedAt: new Date(updatedAt), battery: typeof battery === 'number' ? Number(battery) : undefined, shareUntil: shareUntil ? new Date(shareUntil) : (prev?.shareUntil || undefined) };
  groupMap.set(uid, rec);
  // Geofence event detection (home)
  const home = homeByGroup.get(gid);
  if (home) {
    const wasInside = prev ? isInside(prev, home) : false;
    const isNowInside = isInside(rec, home);
    if (wasInside !== isNowInside) {
      // Broadcast geofence event
      try {
        const { tryGetIO } = require('./socket');
        const io = tryGetIO && tryGetIO();
        if (io) io.to(gid).emit('geofence:event', { groupId: gid, userId: uid, type: isNowInside ? 'arrive_home' : 'leave_home', at: new Date().toISOString() });
      } catch (_) {}
    }
  }
}

function isInside(pos, home) {
  const dx = (pos.lat - home.lat) * 111320;
  const dy = (pos.lng - home.lng) * 111320 * Math.cos((home.lat * Math.PI) / 180);
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist <= (home.radiusMeters || 50);
}

function getGroupPresence(groupId) {
  const gid = String(groupId);
  const groupMap = presenceByGroup.get(gid) || new Map();
  const now = Date.now();
  return Array.from(groupMap.entries())
    .map(([userId, v]) => ({ userId, groupId: gid, ...v }))
    .filter((r) => !r.shareUntil || new Date(r.shareUntil).getTime() > now);
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

function setHomeGeofence(groupId, { lat, lng, radiusMeters }) {
  homeByGroup.set(String(groupId), { lat: Number(lat), lng: Number(lng), radiusMeters: Number(radiusMeters || 50) });
  return homeByGroup.get(String(groupId));
}

module.exports = { updatePresence, getGroupPresence, pruneStale, setHomeGeofence }; 