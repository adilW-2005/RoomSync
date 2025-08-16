import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import utPlaces from '../../assets/ut_places.json';
import api from '../../api/client';
import useAuthStore from '../../state/useAuthStore';
import useGroupStore from '../../state/useGroupStore';
import { connectSocket, joinGroupRoom, onLocationUpdate, getSocket, disconnectSocket } from '../../lib/socket';
import useMemberStore from '../../state/useMemberStore';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTPin from '../../components/UTPin';
import RatingStars from '../../components/RatingStars';
import { spacing, colors } from '../../styles/theme';

export default function MapScreen() {
  const [region, setRegion] = useState({ latitude: 30.2849, longitude: -97.736, latitudeDelta: 0.02, longitudeDelta: 0.02 });
  const [ratings, setRatings] = useState({});
  const [roommatePins, setRoommatePins] = useState({}); // userId -> { lat, lng, updatedAt, battery }
  const { token } = useAuthStore();
  const { currentGroup } = useGroupStore();
  const { membersById, fetchCurrentGroupMembers } = useMemberStore();

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(
        utPlaces.map(async (p) => {
          try {
            const r = await api.get(`/ratings/avg?placeId=${p.placeId}`);
            return [p.placeId, r];
          } catch (_) {
            return [p.placeId, { avg: null }];
          }
        })
      );
      const map = Object.fromEntries(entries);
      setRatings(map);
    })();
  }, []);

  useEffect(() => {
    let offUpdate = null;
    (async () => {
      if (!token || !currentGroup?.id) return;
      try {
        const presence = await api.get(`/locations/presence?groupId=${currentGroup.id}`);
        const map = {};
        for (const p of presence) map[p.userId] = { lat: p.lat, lng: p.lng, updatedAt: p.updatedAt, battery: p.battery };
        setRoommatePins(map);
      } catch (_) {}
      const url = process.env.EXPO_PUBLIC_WS_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
      if (!getSocket()) connectSocket(url, token);
      joinGroupRoom(currentGroup.id);
      offUpdate = onLocationUpdate((payload) => {
        if (String(payload.groupId) !== String(currentGroup.id)) return;
        setRoommatePins((prev) => ({ ...prev, [payload.userId]: { lat: payload.lat, lng: payload.lng, updatedAt: payload.updatedAt, battery: payload.battery } }));
      });
    })();
    return () => { if (offUpdate) offUpdate(); };
  }, [token, currentGroup?.id]);

  useEffect(() => { fetchCurrentGroupMembers(); }, []);

  const descFor = (pos) => {
    if (!pos) return '';
    if (typeof pos.battery === 'number') return `Battery ${pos.battery}%`;
    return pos.updatedAt ? new Date(pos.updatedAt).toLocaleTimeString() : '';
  };

  return (
    <View style={styles.container}>
      <UTText variant="subtitle" style={{ color: colors.burntOrange, padding: spacing.md }}>UT Housing Map</UTText>
      <MapView style={styles.map} initialRegion={region}>
        {utPlaces.map((p) => {
          const avg = ratings[p.placeId]?.avg ?? null;
          return (
            <Marker key={p.placeId} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.placeName}>
              <UTPin />
              <Callout tooltip>
                <UTCard>
                  <UTText variant="subtitle">{p.placeName}</UTText>
                  {avg != null ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <RatingStars value={avg} />
                      <UTText variant="meta" style={{ marginLeft: 6 }}>{avg.toFixed(2)}</UTText>
                    </View>
                  ) : (
                    <UTText variant="meta">Avg rating: N/A</UTText>
                  )}
                </UTCard>
              </Callout>
            </Marker>
          );
        })}
        {Object.entries(roommatePins).map(([userId, pos]) => (
          <Marker key={`rm-${userId}`} coordinate={{ latitude: pos.lat, longitude: pos.lng }} title={`${membersById[userId] || 'Roommate'} (${userId.substring(0, 4)})`}>
            <UTPin isRoommate size={20} />
            <Callout tooltip>
              <UTCard>
                <UTText variant="subtitle">{membersById[userId] || 'Roommate'}</UTText>
                <UTText variant="meta">{descFor(pos)}</UTText>
              </UTCard>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 }
}); 