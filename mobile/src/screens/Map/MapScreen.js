import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Linking, Platform } from 'react-native';
import { MapView, Marker, Callout } from '../../components/MapShim';
import * as Location from 'expo-location';
import useAuthStore from '../../state/useAuthStore';
import useGroupStore from '../../state/useGroupStore';
import { connectSocket, joinGroupRoom, onLocationUpdate, getSocket } from '../../lib/socket';
import useMemberStore from '../../state/useMemberStore';
import useScheduleStore from '../../state/useScheduleStore';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTPin from '../../components/UTPin';
import UTButton from '../../components/UTButton';
import PillTabs from '../../components/PillTabs';
import { spacing, colors } from '../../styles/theme';

export default function MapScreen() {
  const [region, setRegion] = useState({ latitude: 30.2849, longitude: -97.736, latitudeDelta: 0.02, longitudeDelta: 0.02 });
  const [mode, setMode] = useState('Classes'); // 'Classes' | 'Roommates'
  const [roommatePins, setRoommatePins] = useState({}); // userId -> { lat, lng, updatedAt, battery }
  const [userLoc, setUserLoc] = useState(null); // { latitude, longitude }
  const { token } = useAuthStore();
  const { currentGroup } = useGroupStore();
  const { membersById, fetchCurrentGroupMembers } = useMemberStore();
  const { nextClass, etaMinutes, refreshNext } = useScheduleStore();

  // Get current user location for directions context
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          setUserLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          setRegion((r) => ({ ...r, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        }
      } catch (_) {}
    })();
  }, []);

  // Roommate presence bootstrap + live updates
  useEffect(() => {
    let offUpdate = null;
    (async () => {
      if (!token || !currentGroup?.id) return;
      try {
        const api = (await import('../../api/client')).default;
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

  // Auto-refresh next class and ETA when entering Classes mode
  useEffect(() => {
    if (mode === 'Classes') {
      refreshNext();
    }
  }, [mode]);

  const roommateMarkers = useMemo(() => {
    const formatDesc = (pos) => {
      const last = pos?.updatedAt ? new Date(pos.updatedAt).toLocaleTimeString() : '';
      const batt = typeof pos?.battery === 'number' ? ` • Battery ${pos.battery}%` : '';
      return `${last}${batt}`;
    };
    return Object.entries(roommatePins).map(([userId, pos]) => {
      const name = membersById[userId] || 'Roommate';
      const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
      return (
        <Marker key={`rm-${userId}`} coordinate={{ latitude: pos.lat, longitude: pos.lng }} title={name}>
          <UTPin isRoommate size={26} label={initials} />
          <Callout tooltip>
            <UTCard>
              <UTText variant="subtitle">{name}</UTText>
              <UTText variant="meta">{formatDesc(pos)}</UTText>
            </UTCard>
          </Callout>
        </Marker>
      );
    });
  }, [roommatePins, membersById]);

  const classMarker = useMemo(() => {
    if (mode !== 'Classes') return null;
    if (!nextClass?.location?.lat || !nextClass?.location?.lng) return null;
    return (
      <Marker coordinate={{ latitude: nextClass.location.lat, longitude: nextClass.location.lng }} title={`${nextClass.course} • ${nextClass.building} ${nextClass.room || ''}`}>
        <UTPin size={26} />
        <Callout tooltip>
          <UTCard>
            <UTText variant="subtitle">{nextClass.course}</UTText>
            <UTText variant="meta">{nextClass.building} {nextClass.room || ''} • {nextClass.start_time}</UTText>
          </UTCard>
        </Callout>
      </Marker>
    );
  }, [mode, nextClass]);

  const minsUntil = useMemo(() => {
    try {
      if (!nextClass?.start_time) return null;
      const [h, m] = String(nextClass.start_time).split(':').map((x) => parseInt(x, 10));
      const start = new Date(); start.setHours(h, m, 0, 0);
      return Math.max(0, Math.floor((start.getTime() - Date.now()) / 60000));
    } catch (_) { return null; }
  }, [nextClass?.start_time]);

  const openDirections = () => {
    if (!nextClass?.location?.lat || !nextClass?.location?.lng) return;
    const lat = nextClass.location.lat;
    const lng = nextClass.location.lng;
    const label = encodeURIComponent(`${nextClass.course} ${nextClass.building}`);
    if (Platform.OS === 'ios') {
      const url = `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}&dirflg=w`;
      Linking.openURL(url).catch(() => {});
    } else {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ padding: spacing.md, paddingBottom: spacing.sm }}>
        <UTText variant="subtitle" style={{ color: colors.burntOrange }}>UT Map</UTText>
        <PillTabs active={mode} onChange={setMode} tabs={["Classes", "Roommates"]} />
      </View>
      <MapView style={styles.map} initialRegion={region}>
        {mode === 'Roommates' ? roommateMarkers : null}
        {mode === 'Classes' ? classMarker : null}
        {userLoc ? (
          <Marker coordinate={userLoc} title="You">
            <UTPin isRoommate size={20} />
          </Marker>
        ) : null}
      </MapView>

      {mode === 'Classes' ? (
        <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg }}>
          <UTCard>
            <UTText variant="subtitle">Next Class</UTText>
            <UTText variant="meta" style={{ marginTop: 4 }}>
              {nextClass ? `${nextClass.course} • ${nextClass.building} ${nextClass.room || ''} • ${nextClass.start_time}` : 'No upcoming class'}
            </UTText>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              {etaMinutes != null ? (
                <UTText variant="meta">ETA {etaMinutes} min</UTText>
              ) : null}
              {minsUntil != null ? (
                <UTText variant="meta" style={{ marginLeft: spacing.md }}>Starts in {minsUntil} min</UTText>
              ) : null}
            </View>
            <View style={{ marginTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between' }}>
              <UTButton title="Refresh" variant="secondary" onPress={refreshNext} style={{ flex: 1, marginRight: spacing.sm }} />
              <Pressable onPress={openDirections} style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                <UTText variant="label">Directions</UTText>
              </Pressable>
            </View>
          </UTCard>
        </View>
      ) : null}

      {mode === 'Roommates' ? (
        <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg }}>
          <UTCard>
            <UTText variant="subtitle">Roommates</UTText>
            <UTText variant="meta" style={{ marginTop: 4 }}>Live locations for your group. Tap a pin for last seen and battery.</UTText>
          </UTCard>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 }
}); 