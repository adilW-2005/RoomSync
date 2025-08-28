import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, FlatList, Alert, Platform, ActionSheetIOS, ScrollView } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import GradientHeader from '../../components/GradientHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { radii } from '../../styles/theme';
import utPlaces from '../../assets/ut_places.json';
import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import UTPin from '../../components/UTPin';
import RatingStars from '../../components/RatingStars';
import { spacing, colors } from '../../styles/theme';
import useListingStore from '../../state/useListingStore';
import useMemberStore from '../../state/useMemberStore';
import useAuthStore from '../../state/useAuthStore';
import useGroupStore from '../../state/useGroupStore';
import api from '../../api/client';
import { connectSocket, joinGroupRoom, onLocationUpdate, getSocket } from '../../lib/socket';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FadeSlideIn from '../../components/FadeSlideIn';
import useMessageStore from '../../state/useMessageStore';
import useScheduleStore from '../../state/useScheduleStore';
import { startSchedulePolling } from '../../lib/notifications';

export default function LivingScreen({ navigation }) {
  const mapRef = useRef(null);
  const insets = useSafeAreaInsets();
  const [region, setRegion] = useState({ latitude: 30.2849, longitude: -97.736, latitudeDelta: 0.02, longitudeDelta: 0.02 });
  const [showList, setShowList] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Apartment');
  const [layers, setLayers] = useState({ roommates: true, sublets: false });
  const [sheet, setSheet] = useState({ visible: false, kind: null, data: null });
  const [ratings, setRatings] = useState({}); // placeId -> { avg, count? }
  const { items: listings, setFilters, fetch: fetchListings } = useListingStore();
  const { membersById, fetchCurrentGroupMembers } = useMemberStore();
  const { token } = useAuthStore();
  const { currentGroup } = useGroupStore();
  const { openOrCreateListing, openOrCreateDM } = useMessageStore();
  const { nextClass, etaMinutes, refreshNext, ui, hydrate, savePrefs } = useScheduleStore();
  const warningLate = useScheduleStore((s) => s.warningLate);
  const etaText = etaMinutes != null ? `${etaMinutes} min walk` : (nextClass?.location ? 'ETA unavailable (offline?)' : '');
  const [controlsH, setControlsH] = useState(0);

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

  useEffect(() => { hydrate(); }, []);
  useEffect(() => { refreshNext().catch(() => {}); startSchedulePolling().catch(() => {}); }, []);

  // Listings: watch layer and search
  useEffect(() => {
    if (layers.sublets) {
      setFilters({ type: 'sublet', q: search });
      fetchListings();
    }
  }, [layers.sublets, search]);

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
    const q = (search || '').toLowerCase();
    const arr = utPlaces.filter((p) => {
      if (!inBounds(p.lat, p.lng)) return false;
      if (q) return p.placeName.toLowerCase().includes(q);
      if (p.category && p.category !== category) return false;
      return true;
    });
    return arr.sort((a, b) => distanceToCenter(a.lat, a.lng) - distanceToCenter(b.lat, b.lng));
  }, [category, region, search]);

  const filteredSublets = useMemo(() => {
    if (!layers.sublets) return [];
    const arr = (listings || []).filter((l) => inBounds(l.loc?.lat, l.loc?.lng) && (!search || (l.title || '').toLowerCase().includes(search.toLowerCase())));
    return arr.sort((a, b) => distanceToCenter(a.loc.lat, a.loc.lng) - distanceToCenter(b.loc.lat, b.loc.lng));
  }, [layers.sublets, listings, region, search]);

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
    const options = ['Upload Schedule', 'Add Sublet', 'Add Review', 'Cancel'];
    const cancelButtonIndex = 3;
    const handle = (i) => {
      if (i === 0) return navigation.navigate('UploadSchedule');
      if (i === 1) return navigation.navigate('Marketplace', { screen: 'MarketplaceList', params: { type: 'sublet' } });
      if (i === 2) return navigation.navigate('RatingsList');
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex }, handle);
    } else {
      Alert.alert('Create', '', [
        { text: 'Upload Schedule', onPress: () => handle(0) },
        { text: 'Add Sublet', onPress: () => handle(1) },
        { text: 'Add Review', onPress: () => handle(2) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const renderListItem = ({ item }) => {
    if (layers.sublets) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: '#EFEFF4', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="home" size={18} color={colors.burntOrange} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <UTText variant="subtitle" numberOfLines={1}>{item.title}</UTText>
            <UTText variant="meta" style={{ marginTop: 2 }}>${item.price?.toFixed(0) || '—'}</UTText>
          </View>
          <UTButton title="Open" onPress={() => { centerOn(item.loc.lat, item.loc.lng); openSheet('sublet', item); }} />
        </View>
      );
    }
    if (!layers.sublets && !layers.roommates) {
      const avg = ratings[item.placeId]?.avg ?? null;
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: '#FFE4D1', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="business-outline" size={18} color={colors.burntOrange} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <UTText variant="subtitle" numberOfLines={1}>{item.placeName}</UTText>
            {avg != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <RatingStars value={avg} />
                <UTText variant="meta" style={{ marginLeft: 6 }}>{avg.toFixed(2)}</UTText>
              </View>
            ) : <UTText variant="meta">No ratings</UTText>}
          </View>
          <UTButton title="Open" onPress={() => { centerOn(item.lat, item.lng); openSheet('rating', item); }} />
        </View>
      );
    }
    if (layers.roommates) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: '#FFE4D1', alignItems: 'center', justifyContent: 'center' }}>
            <UTText variant="subtitle" style={{ color: colors.burntOrange }}>{(item.name || '?').slice(0,1)}</UTText>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <UTText variant="subtitle" numberOfLines={1}>{item.name}</UTText>
            <UTText variant="meta" style={{ marginTop: 2 }}>{item.battery != null ? `Battery ${item.battery}%` : ''}</UTText>
          </View>
          <UTButton title="Open" onPress={() => { centerOn(item.lat, item.lng); openSheet('roommate', item); }} />
        </View>
      );
    }
    return null;
  };

  const countdown = (() => {
    try {
      if (!nextClass?.start_time) return null;
      const [h, m] = nextClass.start_time.split(':').map((x) => parseInt(x, 10));
      const start = new Date(); start.setHours(h, m, 0, 0);
      const diffMs = start - Date.now(); if (diffMs <= 0) return 'Now';
      const mins = Math.floor(diffMs / 60000); const hrs = Math.floor(mins / 60); const rem = mins % 60;
      return hrs > 0 ? `${hrs}h ${rem}m` : `${mins}m`;
    } catch (_) { return null; }
  })();

  return (
    <View style={styles.container}>
      <GradientHeader title="Living" rightIcon="options-outline" />

      {/* Background map fills entire screen */}
      <MapView ref={mapRef} style={styles.map} provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined} initialRegion={region} onRegionChangeComplete={setRegion}>
        {/* Category pins */}
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

      </MapView>

      {/* Faint top gradient over map area */}
      <LinearGradient
        colors={["rgba(191,87,0,0.08)", 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.topOverlay}
        pointerEvents="none"
      />

      {/* Controls overlay */}
      <View style={[styles.controls, { top: insets.top + spacing.sm }]}> 
        <View style={styles.controlsBg} onLayout={(e) => setControlsH(e.nativeEvent.layout.height)}>
          <View style={styles.topBar}>
            <UTInput placeholder="Search apartments, dorms, sublets, roommates" value={search} onChangeText={setSearch} style={{ flex: 1 }} />
            <Pressable onPress={() => setShowList(!showList)} style={styles.iconBtn} accessibilityLabel="Toggle List">
              <Ionicons name={showList ? 'map' : 'list'} size={20} color="#2C2C2E" />
            </Pressable>
          </View>
          <View style={styles.chipsOneLine}>
            {['Apartment','Dorm'].map((cat) => {
              const active = category === cat;
              return (
                <Pressable key={cat} onPress={() => setCategory(cat)} style={[styles.chip, { backgroundColor: active ? colors.burntOrange : '#EFEFF4' }]}> 
                  <UTText variant="meta" style={{ color: active ? colors.white : '#2C2C2E' }}>{cat}</UTText>
                </Pressable>
              );
            })}
            {[
              { key: 'sublets', label: 'Sublets' },
              { key: 'roommates', label: 'Roommates' },
            ].map((chip) => {
              const active = layers[chip.key];
              return (
                <Pressable key={chip.key} onPress={() => toggleLayer(chip.key)} style={[styles.chip, { backgroundColor: active ? colors.burntOrange : '#EFEFF4' }]}> 
                  <UTText variant="meta" style={{ color: active ? colors.white : '#2C2C2E' }}>{chip.label}</UTText>
                </Pressable>
              );
            })}
          </View>

          {/* Next Class card inside controls to avoid overlap */}
          {ui.showNextCard ? (
          <View style={{ marginTop: spacing.sm }}>
            <View style={styles.cardShadow}>
              <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
                <UTCard style={{ backgroundColor: 'transparent' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#E1F0FF', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="walk-outline" size={14} color={'#0A84FF'} />
                      </View>
                      <UTText variant="subtitle">Next Class</UTText>
                    </View>
                    <Pressable onPress={() => savePrefs({ showNextCard: false })} accessibilityLabel="Hide next class">
                      <UTText variant="meta" style={{ color: colors.burntOrange }}>Hide</UTText>
                    </Pressable>
                  </View>
                  {nextClass ? (
                    <View style={{ gap: 6 }}>
                      <UTText variant="body">{nextClass.course} · {nextClass.title || ''}</UTText>
                      <UTText variant="meta">{nextClass.building} {nextClass.room || ''} · {nextClass.start_time}</UTText>
                      <UTText variant="meta">In {countdown || '—'}{etaText ? ` · ${etaText}` : ''}</UTText>
                      {warningLate ? (<UTText variant="meta" style={{ color: '#B00020' }}>Warning: ETA may exceed class start</UTText>) : null}
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                        <Pressable onPress={() => refreshNext()} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#EEE', borderRadius: 8 }}>
                          <UTText variant="body">Refresh</UTText>
                        </Pressable>
                        {nextClass?.location?.lat && (
                          <Pressable onPress={() => navigation.navigate('MapGuide', { dest: { lat: nextClass.location.lat, lng: nextClass.location.lng, title: `${nextClass.building} ${nextClass.room || ''}` } })} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.burntOrange, borderRadius: 8 }}>
                              <UTText variant="body" style={{ color: '#FFF' }}>Guide Me</UTText>
                            </Pressable>
                        )}
                      </View>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <UTText variant="meta">No upcoming classes today.</UTText>
                      <Pressable onPress={() => navigation.navigate('UploadSchedule')} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.burntOrange, borderRadius: 8, alignSelf: 'flex-start' }}>
                        <UTText variant="body" style={{ color: '#FFF' }}>Upload Schedule</UTText>
                      </Pressable>
                    </View>
                  )}
                </UTCard>
              </LinearGradient>
            </View>
          </View>
          ) : (
            <View style={{ marginTop: spacing.sm, alignItems: 'flex-end' }}>
              <Pressable onPress={() => savePrefs({ showNextCard: true })} style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#EFEFF4', borderRadius: 8 }}>
                <UTText variant="meta" style={{ color: '#2C2C2E' }}>Show Next Class</UTText>
              </Pressable>
            </View>
          )}

        </View>
      </View>

      {/* Optional list overlay */}
      {showList ? (
        <View style={[styles.listOverlay, { top: (insets.top + spacing.sm) + controlsH + spacing.sm }]}> 
          <FlatList
            data={layers.sublets ? filteredSublets : (layers.roommates ? filteredRoommates : filteredPlaces)}
            keyExtractor={(i, idx) => i.id || i.placeId || i.userId || String(idx)}
            renderItem={({ item, index }) => (
              <FadeSlideIn delay={index * 40}>
                <View style={styles.cardShadow}>
                  <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
                    <UTCard style={{ backgroundColor: 'transparent' }}>
                      {renderListItem({ item })}
                    </UTCard>
                  </LinearGradient>
                </View>
              </FadeSlideIn>
            )}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : null}

      {/* FAB */}
      <Pressable onPress={onFab} style={styles.fab} accessibilityLabel="Create">
        <Ionicons name="add" size={26} color={colors.white} />
      </Pressable>

      {/* Bottom Sheet */}
      {sheet.visible ? (
        <View style={styles.sheetBackdrop}> 
          <View style={styles.sheet}>
            <View style={styles.handleContainer}><View style={styles.handle} /></View>
            <View style={styles.cardShadow}>
              <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}> 
                <UTCard style={{ backgroundColor: 'transparent' }}>
                  {sheet.kind === 'rating' ? (
                    <>
                      <UTText variant="subtitle">{sheet.data.placeName}</UTText>
                      {sheet.data.address ? <UTText variant="meta" style={{ marginTop: spacing.xs }}>{sheet.data.address}</UTText> : null}
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                        {ratings[sheet.data.placeId]?.avg != null ? (
                          <>
                            <RatingStars value={ratings[sheet.data.placeId].avg} />
                            <UTText variant="meta" style={{ marginLeft: 6 }}>{ratings[sheet.data.placeId].avg.toFixed(2)}</UTText>
                          </>
                        ) : <UTText variant="meta">No rating</UTText>}
                      </View>
                      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                        <UTButton title="Open Reviews" onPress={() => { closeSheet(); navigation.navigate('RatingsDetail', { place: sheet.data }); }} style={{ flex: 1 }} />
                        <UTButton title="View Sublets" variant="secondary" onPress={() => { closeSheet(); navigation.navigate('Marketplace', { screen: 'MarketplaceList', params: { type: 'sublet', q: sheet.data.placeName } }); }} style={{ flex: 1 }} />
                      </View>
                    </>
                  ) : sheet.kind === 'sublet' ? (
                    <>
                      <UTText variant="subtitle">{sheet.data.title}</UTText>
                      <UTText variant="meta" style={{ marginTop: spacing.xs }}>${sheet.data.price?.toFixed(0) || '—'}</UTText>
                      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                        <UTButton title="Save" onPress={async () => { try { await api.post(`/listings/${sheet.data.id}/favorite`); Alert.alert('Saved to favorites'); } catch (e) { Alert.alert('Failed', e.message || 'Try again'); } }} style={{ flex: 1 }} />
                        <UTButton title="View Listing" variant="secondary" onPress={() => { closeSheet(); navigation.navigate('Marketplace', { screen: 'ListingDetail', params: { listing: sheet.data } }); }} style={{ flex: 1 }} />
                      </View>
                      <UTButton title="Message Seller" onPress={async () => { try { const conv = await openOrCreateListing(sheet.data.id, sheet.data.sellerId); closeSheet(); navigation.navigate('Messages', { screen: 'Conversation', params: { conversationId: conv.id } }); } catch (e) { Alert.alert('Failed', e.message || 'Try again'); } }} style={{ marginTop: spacing.sm }} />
                    </>
                  ) : sheet.kind === 'roommate' ? (
                    <>
                      <UTText variant="subtitle">{sheet.data.name}</UTText>
                      <UTText variant="meta" style={{ marginTop: spacing.xs }}>{sheet.data.battery != null ? `Battery ${sheet.data.battery}%` : ''}</UTText>
                      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                        <UTButton title="Roommate Summary" onPress={() => { closeSheet(); navigation.navigate('Dashboard', { screen: 'DashboardHome' }); }} style={{ flex: 1 }} />
                        <UTButton title="Message" variant="secondary" onPress={async () => { try { const conv = await openOrCreateDM(sheet.data.userId); closeSheet(); navigation.navigate('Messages', { screen: 'Conversation', params: { conversationId: conv.id } }); } catch (e) { Alert.alert('Failed', e.message || 'Try again'); } }} style={{ flex: 1 }} />
                      </View>
                    </>
                  ) : null}
                  <UTButton title="Close" variant="secondary" onPress={closeSheet} style={{ marginTop: spacing.md }} />
                </UTCard>
              </LinearGradient>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  controls: { position: 'absolute', left: spacing.lg, right: spacing.lg, zIndex: 10 },
  controlsBg: { backgroundColor: 'transparent', borderRadius: 0, padding: 0, shadowColor: 'transparent', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  chipsRow: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: 'transparent' },
  chipsOneLine: { marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipsRowContent: { paddingVertical: 6, columnGap: 8 },
  chip: { paddingHorizontal: 12, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  map: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  listOverlay: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: 110, maxHeight: '55%', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, overflow: 'hidden' },
  cardShadow: { borderRadius: radii.card, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 7 },
  gradientCard: { borderRadius: radii.card, overflow: 'hidden' },
  fab: { position: 'absolute', right: 20, bottom: 28, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.burntOrange, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  sheetBackdrop: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'transparent', padding: spacing.lg },
  handleContainer: { alignItems: 'center', paddingBottom: spacing.sm },
  handle: { width: 42, height: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.15)' },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
}); 