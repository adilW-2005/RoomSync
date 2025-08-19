import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, FlatList, Alert, Platform, ActionSheetIOS } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import utPlaces from '../../assets/ut_places.json';
import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import UTPin from '../../components/UTPin';
import RatingStars from '../../components/RatingStars';
import { spacing, colors } from '../../styles/theme';
import useListingStore from '../../state/useListingStore';
import useEventStore from '../../state/useEventStore';
import useMemberStore from '../../state/useMemberStore';
import useAuthStore from '../../state/useAuthStore';
import useGroupStore from '../../state/useGroupStore';
import api from '../../api/client';
import { connectSocket, joinGroupRoom, onLocationUpdate, getSocket } from '../../lib/socket';

export default function LivingScreen({ navigation }) {
  const mapRef = useRef(null);
  const [region, setRegion] = useState({ latitude: 30.2849, longitude: -97.736, latitudeDelta: 0.02, longitudeDelta: 0.02 });
  const [showList, setShowList] = useState(false);
  const [search, setSearch] = useState('');
  const [layers, setLayers] = useState({ ratings: true, roommates: true, sublets: false, events: false });
  const [sheet, setSheet] = useState({ visible: false, kind: null, data: null });
  const [ratings, setRatings] = useState({}); // placeId -> { avg, count? }
  const { items: listings, setFilters, fetch: fetchListings } = useListingStore();
  const { events, fetchEvents } = useEventStore();
  const { membersById, fetchCurrentGroupMembers } = useMemberStore();
  const { token } = useAuthStore();
  const { currentGroup } = useGroupStore();

  // Preload rating averages for UT places
  useEffect(() => {
    (async () => {
      const entries = await Promise.all(
        utPlaces.map(async (p) => {
          try {
            const r = await api.get(`/ratings/avg?placeId=${p.placeId}`);
            return [p.placeId, r];
          } catch (_) { return [p.placeId, { avg: null }]; }
        })
      );
      setRatings(Object.fromEntries(entries));
    })();
  }, []);

  // Listings: watch layer and search
  useEffect(() => {
    if (layers.sublets) {
      setFilters({ type: 'sublet', q: search });
      fetchListings();
    }
  }, [layers.sublets, search]);

  // Events
  useEffect(() => { if (layers.events) fetchEvents(); }, [layers.events]);

  // Roommates presence via socket
  const [roommatePins, setRoommatePins] = useState({});
  useEffect(() => { fetchCurrentGroupMembers(); }, []);
  useEffect(() => {
    let offUpdate = null;
    (async () => {
      if (!layers.roommates) return;
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
        if (!layers.roommates) return;
        if (String(payload.groupId) !== String(currentGroup.id)) return;
        setRoommatePins((prev) => ({ ...prev, [payload.userId]: { lat: payload.lat, lng: payload.lng, updatedAt: payload.updatedAt, battery: payload.battery } }));
      });
    })();
    return () => { if (offUpdate) offUpdate(); };
  }, [token, currentGroup?.id, layers.roommates]);

  // Layer chips
  const toggleLayer = (key) => setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  const inBounds = (lat, lng) => {
    if (!lat || !lng) return false;
    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    const minLat = latitude - latitudeDelta / 2;
    const maxLat = latitude + latitudeDelta / 2;
    const minLng = longitude - longitudeDelta / 2;
    const maxLng = longitude + longitudeDelta / 2;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  };

  const distanceToCenter = (lat, lng) => {
    const R = 6371e3;
    const toRad = (d) => (d * Math.PI) / 180;
    const lat1 = toRad(region.latitude);
    const lat2 = toRad(lat);
    const dLat = toRad(lat - region.latitude);
    const dLng = toRad(lng - region.longitude);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const filteredPlaces = useMemo(() => {
    const arr = utPlaces.filter((p) => {
      if (!layers.ratings) return false;
      if (!inBounds(p.lat, p.lng)) return false;
      if (!search) return true;
      return p.placeName.toLowerCase().includes(search.toLowerCase());
    });
    return arr.sort((a, b) => distanceToCenter(a.lat, a.lng) - distanceToCenter(b.lat, b.lng));
  }, [layers.ratings, region, search]);

  const filteredSublets = useMemo(() => {
    if (!layers.sublets) return [];
    const arr = (listings || []).filter((l) => inBounds(l.loc?.lat, l.loc?.lng) && (!search || (l.title || '').toLowerCase().includes(search.toLowerCase())));
    return arr.sort((a, b) => distanceToCenter(a.loc.lat, a.loc.lng) - distanceToCenter(b.loc.lat, b.loc.lng));
  }, [layers.sublets, listings, region, search]);

  const filteredEvents = useMemo(() => {
    if (!layers.events) return [];
    const arr = (events || []).filter((e) => typeof e.lat === 'number' && typeof e.lng === 'number' && inBounds(e.lat, e.lng) && (!search || (e.title || '').toLowerCase().includes(search.toLowerCase())));
    return arr.sort((a, b) => distanceToCenter(a.lat, a.lng) - distanceToCenter(b.lat, b.lng));
  }, [layers.events, events, region, search]);

  const filteredRoommates = useMemo(() => {
    if (!layers.roommates) return [];
    const arr = Object.entries(roommatePins).map(([userId, pos]) => ({ userId, ...pos, name: membersById[userId] || 'Roommate' })).filter((r) => inBounds(r.lat, r.lng) && (!search || (r.name || '').toLowerCase().includes(search.toLowerCase())));
    return arr.sort((a, b) => distanceToCenter(a.lat, a.lng) - distanceToCenter(b.lat, b.lng));
  }, [layers.roommates, roommatePins, region, search, membersById]);

  const centerOn = (lat, lng) => {
    if (!mapRef.current) return;
    mapRef.current.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: region.latitudeDelta, longitudeDelta: region.longitudeDelta }, 300);
  };

  const openSheet = (kind, data) => setSheet({ visible: true, kind, data });
  const closeSheet = () => setSheet({ visible: false, kind: null, data: null });

  const onFab = () => {
    const options = ['Add Sublet', 'Add Review', 'Create Event', 'Cancel'];
    const cancelButtonIndex = 3;
    const handle = (i) => {
      if (i === 0) return navigation.navigate('Marketplace', { screen: 'MarketplaceList', params: { type: 'sublet' } });
      if (i === 1) return navigation.navigate('RatingsList');
      if (i === 2) return navigation.navigate('Events', { openCreateWith: { lat: region.latitude, lng: region.longitude } });
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex }, handle);
    } else {
      Alert.alert('Create', '', [
        { text: 'Add Sublet', onPress: () => handle(0) },
        { text: 'Add Review', onPress: () => handle(1) },
        { text: 'Create Event', onPress: () => handle(2) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const rsvp = async (eventId, status) => {
    try {
      await api.post(`/events/${eventId}/rsvp`, { status });
      Alert.alert('RSVP updated');
    } catch (e) {
      Alert.alert('RSVP failed', e.message || 'Try again');
    }
  };

  const renderListItem = ({ item }) => {
    if (layers.sublets) {
      return (
        <UTCard style={{ marginBottom: spacing.sm }}>
          <UTText variant="subtitle">{item.title}</UTText>
          <UTText variant="meta" style={{ marginTop: 4 }}>${item.price?.toFixed(0) || '—'}</UTText>
          <UTButton title="Open" onPress={() => { centerOn(item.loc.lat, item.loc.lng); openSheet('sublet', item); }} style={{ marginTop: spacing.xs, alignSelf: 'flex-start' }} />
        </UTCard>
      );
    }
    if (layers.ratings) {
      const avg = ratings[item.placeId]?.avg ?? null;
      return (
        <UTCard style={{ marginBottom: spacing.sm }}>
          <UTText variant="subtitle">{item.placeName}</UTText>
          {avg != null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <RatingStars value={avg} />
              <UTText variant="meta" style={{ marginLeft: 6 }}>{avg.toFixed(2)}</UTText>
            </View>
          ) : <UTText variant="meta">No ratings</UTText>}
          <UTButton title="Open" onPress={() => { centerOn(item.lat, item.lng); openSheet('rating', item); }} style={{ marginTop: spacing.xs, alignSelf: 'flex-start' }} />
        </UTCard>
      );
    }
    if (layers.events) {
      return (
        <UTCard style={{ marginBottom: spacing.sm }}>
          <UTText variant="subtitle">{item.title}</UTText>
          <UTText variant="meta" style={{ marginTop: 4 }}>{new Date(item.startAt).toLocaleString()}</UTText>
          <UTButton title="Open" onPress={() => { centerOn(item.lat, item.lng); openSheet('event', item); }} style={{ marginTop: spacing.xs, alignSelf: 'flex-start' }} />
        </UTCard>
      );
    }
    if (layers.roommates) {
      return (
        <UTCard style={{ marginBottom: spacing.sm }}>
          <UTText variant="subtitle">{item.name}</UTText>
          <UTText variant="meta" style={{ marginTop: 4 }}>{item.battery != null ? `Battery ${item.battery}%` : ''}</UTText>
          <UTButton title="Open" onPress={() => { centerOn(item.lat, item.lng); openSheet('roommate', item); }} style={{ marginTop: spacing.xs, alignSelf: 'flex-start' }} />
        </UTCard>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.topBar}>
        <UTInput placeholder="Search places, sublets, events, roommates" value={search} onChangeText={setSearch} style={{ flex: 1 }} />
        <Pressable onPress={() => setShowList(!showList)} style={styles.iconBtn} accessibilityLabel="Toggle List">
          <Ionicons name={showList ? 'map' : 'list'} size={20} color="#2C2C2E" />
        </Pressable>
      </View>

      {/* Layer chips */}
      <View style={styles.chipsRow}>
        {[
          { key: 'sublets', label: 'Sublets' },
          { key: 'ratings', label: 'Ratings' },
          { key: 'roommates', label: 'Roommates' },
          { key: 'events', label: 'Events' },
        ].map((chip) => {
          const active = layers[chip.key];
          return (
            <Pressable key={chip.key} onPress={() => toggleLayer(chip.key)} style={[styles.chip, { backgroundColor: active ? colors.burntOrange : '#EFEFF4' }]}>
              <UTText variant="meta" style={{ color: active ? colors.white : '#2C2C2E' }}>{chip.label}</UTText>
            </Pressable>
          );
        })}
      </View>

      {/* Map or List */}
      {!showList ? (
        <MapView ref={mapRef} style={styles.map} initialRegion={region} onRegionChangeComplete={setRegion}>
          {/* Ratings pins */}
          {filteredPlaces.map((p) => {
            const avg = ratings[p.placeId]?.avg ?? null;
            return (
              <Marker key={`pl-${p.placeId}`} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.placeName} onPress={() => openSheet('rating', p)}>
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

          {/* Sublets pins */}
          {filteredSublets.map((l) => (
            <Marker key={`sl-${l.id}`} coordinate={{ latitude: l.loc.lat, longitude: l.loc.lng }} title={l.title} onPress={() => openSheet('sublet', l)}>
              <UTPin />
            </Marker>
          ))}

          {/* Roommates pins */}
          {filteredRoommates.map((r) => (
            <Marker key={`rm-${r.userId}`} coordinate={{ latitude: r.lat, longitude: r.lng }} title={r.name} onPress={() => openSheet('roommate', r)}>
              <UTPin isRoommate size={20} />
            </Marker>
          ))}

          {/* Events pins */}
          {filteredEvents.map((e) => (
            <Marker key={`ev-${e.id}`} coordinate={{ latitude: e.lat, longitude: e.lng }} title={e.title} onPress={() => openSheet('event', e)}>
              <UTPin />
            </Marker>
          ))}
        </MapView>
      ) : (
        <View style={styles.listPane}>
          <FlatList
            data={layers.sublets ? filteredSublets : layers.events ? filteredEvents : layers.roommates ? filteredRoommates : filteredPlaces}
            keyExtractor={(i, idx) => i.id || i.placeId || i.userId || String(idx)}
            renderItem={renderListItem}
          />
        </View>
      )}

      {/* FAB */}
      <Pressable onPress={onFab} style={styles.fab} accessibilityLabel="Create">
        <Ionicons name="add" size={26} color={colors.white} />
      </Pressable>

      {/* Bottom Sheet */}
      {sheet.visible ? (
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            {sheet.kind === 'rating' ? (
              <>
                <UTText variant="subtitle">{sheet.data.placeName}</UTText>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                  {ratings[sheet.data.placeId]?.avg != null ? (
                    <>
                      <RatingStars value={ratings[sheet.data.placeId].avg} />
                      <UTText variant="meta" style={{ marginLeft: 6 }}>{ratings[sheet.data.placeId].avg.toFixed(2)}</UTText>
                    </>
                  ) : <UTText variant="meta">No rating</UTText>}
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <UTButton title="Open Reviews" onPress={() => { closeSheet(); navigation.navigate('RatingsList'); }} />
                  <UTButton title="See Sublets Here" variant="secondary" onPress={() => { closeSheet(); setLayers({ ...layers, sublets: true }); setSearch(sheet.data.placeName); }} />
                </View>
              </>
            ) : sheet.kind === 'sublet' ? (
              <>
                <UTText variant="subtitle">{sheet.data.title}</UTText>
                <UTText variant="meta" style={{ marginTop: spacing.xs }}>${sheet.data.price?.toFixed(0) || '—'}</UTText>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <UTButton title="Save" onPress={async () => { try { await api.post(`/listings/${sheet.data.id}/favorite`); Alert.alert('Saved to favorites'); } catch (e) { Alert.alert('Failed', e.message || 'Try again'); } }} />
                  <UTButton title="View Listing" variant="secondary" onPress={() => { closeSheet(); navigation.navigate('Marketplace', { screen: 'ListingDetail', params: { listing: sheet.data } }); }} />
                </View>
              </>
            ) : sheet.kind === 'roommate' ? (
              <>
                <UTText variant="subtitle">{sheet.data.name}</UTText>
                <UTText variant="meta" style={{ marginTop: spacing.xs }}>{sheet.data.battery != null ? `Battery ${sheet.data.battery}%` : ''}</UTText>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <UTButton title="Roommate Summary" onPress={() => { closeSheet(); navigation.navigate('Dashboard', { screen: 'DashboardHome' }); }} />
                </View>
              </>
            ) : sheet.kind === 'event' ? (
              <>
                <UTText variant="subtitle">{sheet.data.title}</UTText>
                <UTText variant="meta" style={{ marginTop: spacing.xs }}>{new Date(sheet.data.startAt).toLocaleString()}</UTText>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <UTButton title="RSVP Going" onPress={() => rsvp(sheet.data.id, 'going')} />
                  <UTButton title="Open Event" variant="secondary" onPress={() => { closeSheet(); navigation.navigate('Events'); }} />
                </View>
              </>
            ) : null}
            <UTButton title="Close" variant="secondary" onPress={closeSheet} style={{ marginTop: spacing.md }} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: { position: 'absolute', top: spacing.lg, left: spacing.lg, right: spacing.lg, zIndex: 10, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chipsRow: { position: 'absolute', top: spacing.lg + 52, left: spacing.lg, right: spacing.lg, zIndex: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFEFF4', alignItems: 'center', justifyContent: 'center' },
  map: { flex: 1 },
  listPane: { flex: 1, paddingTop: 120, paddingHorizontal: spacing.lg },
  fab: { position: 'absolute', right: 20, bottom: 28, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.burntOrange, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  sheetBackdrop: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: spacing.lg, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
}); 