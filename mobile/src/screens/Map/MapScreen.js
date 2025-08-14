import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import utPlaces from '../../assets/ut_places.json';
import api from '../../api/client';
import useAuthStore from '../../state/useAuthStore';
import useGroupStore from '../../state/useGroupStore';
import { connectSocket, joinGroupRoom, onLocationUpdate, getSocket, disconnectSocket } from '../../lib/socket';
import useMemberStore from '../../state/useMemberStore';

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
      // Fetch initial presence
      try {
        const presence = await api.get(`/locations/presence?groupId=${currentGroup.id}`);
        const map = {};
        for (const p of presence) map[p.userId] = { lat: p.lat, lng: p.lng, updatedAt: p.updatedAt, battery: p.battery };
        setRoommatePins(map);
      } catch (_) {}
      // Connect socket if not connected
      const url = process.env.EXPO_PUBLIC_WS_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
      if (!getSocket()) connectSocket(url, token);
      joinGroupRoom(currentGroup.id);
      offUpdate = onLocationUpdate((payload) => {
        if (String(payload.groupId) !== String(currentGroup.id)) return;
        setRoommatePins((prev) => ({ ...prev, [payload.userId]: { lat: payload.lat, lng: payload.lng, updatedAt: payload.updatedAt, battery: payload.battery } }));
      });
    })();
    return () => {
      if (offUpdate) offUpdate();
    };
  }, [token, currentGroup?.id]);

  useEffect(() => { fetchCurrentGroupMembers(); }, []);

  const colorFor = (avg) => {
    if (avg == null) return '#8E8E93';
    if (avg >= 4.5) return '#2ecc71';
    if (avg >= 3.5) return '#f1c40f';
    return '#e74c3c';
  };

  const descFor = (pos) => {
    if (!pos) return '';
    if (typeof pos.battery === 'number') return `Battery ${pos.battery}%`;
    return pos.updatedAt ? new Date(pos.updatedAt).toLocaleTimeString() : '';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>UT Housing Map</Text>
      <MapView style={styles.map} initialRegion={region}>
        {utPlaces.map((p) => {
          const avg = ratings[p.placeId]?.avg ?? null;
          return (
            <Marker key={p.placeId} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.placeName} pinColor={colorFor(avg)} />
          );
        })}
        {Object.entries(roommatePins).map(([userId, pos]) => (
          <Marker
            key={`rm-${userId}`}
            coordinate={{ latitude: pos.lat, longitude: pos.lng }}
            title={`${membersById[userId] || 'Roommate'} (${userId.substring(0, 4)})`}
            description={descFor(pos)}
            pinColor="#1E90FF"
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 18, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', padding: 12 },
  map: { flex: 1 }
}); 