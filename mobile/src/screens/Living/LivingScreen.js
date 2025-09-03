import React, { useEffect, useMemo, useState, useRef } from 'react';
import { View, StyleSheet, Pressable, Linking, Platform, Modal, ScrollView, Alert, TextInput } from 'react-native';
import { MapView, Marker, Callout, Polyline } from '../../components/MapShim';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTPin from '../../components/UTPin';
import UTButton from '../../components/UTButton';
import { spacing, colors } from '../../styles/theme';
import useAuthStore from '../../state/useAuthStore';
import useGroupStore from '../../state/useGroupStore';
import useMemberStore from '../../state/useMemberStore';
import useScheduleStore from '../../state/useScheduleStore';
import { connectSocket, joinGroupRoom, onLocationUpdate, getSocket } from '../../lib/socket';
import { NavAPI, ScheduleAPI } from '../../api/sdk';

function decodePolyline(encoded) {
  if (!encoded) return [];
  let points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1)); lat += dlat;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1)); lng += dlng;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export default function LivingScreen({ navigation }) {
  const mapRef = useRef(null);
  const [region, setRegion] = useState({ latitude: 30.2849, longitude: -97.736, latitudeDelta: 0.02, longitudeDelta: 0.02 });
  const [roommatePins, setRoommatePins] = useState({}); // userId -> { lat, lng, updatedAt, battery }
  const [userLoc, setUserLoc] = useState(null); // { latitude, longitude }
  const [guiding, setGuiding] = useState(false);
  const [routeCoords, setRouteCoords] = useState([]); // decoded polyline
  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const { token } = useAuthStore();
  const { currentGroup } = useGroupStore();
  const { membersById, fetchCurrentGroupMembers } = useMemberStore();
  const { nextClass, etaMinutes, refreshNext, ui, hydrate, savePrefs, shouldShowScheduleFlow } = useScheduleStore();

  // Hydrate schedule UI prefs (show/hide next card)
  useEffect(() => { hydrate?.(); }, []);

  // User location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setUserLoc(loc);
          setRegion((r) => ({ ...r, ...loc }));
        }
      } catch (_) {}
    })();
  }, []);

  // Presence bootstrap + live updates
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
  useEffect(() => { refreshNext(); }, []);

  async function fetchRouteWithFit() {
    try {
      if (!userLoc || !nextClass?.location?.lat || !nextClass?.location?.lng) return;
      const r = await NavAPI.getRoute({ originLat: userLoc.latitude, originLng: userLoc.longitude, destLat: nextClass.location.lat, destLng: nextClass.location.lng });
      const points = decodePolyline(r.polyline || '');
      const coords = points.length ? points.map(([lat, lng]) => ({ latitude: lat, longitude: lng })) : [userLoc, { latitude: nextClass.location.lat, longitude: nextClass.location.lng }];
      setRouteCoords(coords);
      if (mapRef.current && coords.length) {
        mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 60, bottom: 60, left: 40, right: 40 }, animated: true });
      }
    } catch (_) {}
  }

  // Fetch route when guiding toggles on or when user/class location changes
  useEffect(() => {
    (async () => {
      if (!guiding) { setRouteCoords([]); return; }
      await fetchRouteWithFit();
    })();
  }, [guiding, userLoc?.latitude, userLoc?.longitude, nextClass?.location?.lat, nextClass?.location?.lng]);

  // Periodically refresh directions while guiding (every 60s), and update origin
  useEffect(() => {
    if (!guiding) return;
    const t = setInterval(async () => {
      try {
        const pos = await Location.getCurrentPositionAsync({});
        setUserLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        await fetchRouteWithFit();
      } catch (_) {}
    }, 60000);
    return () => clearInterval(t);
  }, [guiding]);

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
  }, [nextClass]);

  const minsUntil = useMemo(() => {
    try {
      if (!nextClass?.start_time) return null;
      const [h, m] = String(nextClass.start_time).split(':').map((x) => parseInt(x, 10));
      const start = new Date(); start.setHours(h, m, 0, 0);
      return Math.max(0, Math.floor((start.getTime() - Date.now()) / 60000));
    } catch (_) { return null; }
  }, [nextClass?.start_time]);

  const openExternalMaps = () => {
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

  const onGuideToggle = () => {
    setGuiding((g) => !g);
    if (!guiding) refreshNext();
  };

  const loadSchedule = async () => {
    try {
      const result = await ScheduleAPI.getAll();
      setScheduleEvents(result.events || []);
    } catch (e) {
      console.error('Failed to load schedule:', e);
    }
  };

  const deleteScheduleEvent = async (index) => {
    try {
      const updatedEvents = scheduleEvents.filter((_, i) => i !== index);
      await ScheduleAPI.saveAll(updatedEvents);
      setScheduleEvents(updatedEvents);
      refreshNext();
      Alert.alert('Success', 'Class deleted');
    } catch (e) {
      Alert.alert('Error', 'Failed to delete class');
    }
  };

  const startEditingEvent = (index) => {
    const event = scheduleEvents[index];
    setEditingEvent(index);
    setEditForm({
      course: event.course || '',
      building: event.building || '',
      room: event.room || '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      days: Array.isArray(event.days) ? event.days.join('') : ''
    });
  };

  const saveEditedEvent = async () => {
    try {
      if (!editForm.course || !editForm.building || !editForm.start_time || !editForm.end_time || !editForm.days) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const updatedEvents = [...scheduleEvents];
      updatedEvents[editingEvent] = {
        ...scheduleEvents[editingEvent],
        course: editForm.course,
        building: editForm.building.toUpperCase(),
        room: editForm.room,
        start_time: editForm.start_time,
        end_time: editForm.end_time,
        days: editForm.days.split('').filter(d => ['M', 'T', 'W', 'Th', 'F'].includes(d))
      };

      await ScheduleAPI.saveAll(updatedEvents);
      setScheduleEvents(updatedEvents);
      setEditingEvent(null);
      setEditForm({});
      refreshNext();
      Alert.alert('Success', 'Class updated');
    } catch (e) {
      Alert.alert('Error', 'Failed to update class');
    }
  };

  const cancelEditing = () => {
    setEditingEvent(null);
    setEditForm({});
  };

  const openScheduleModal = async () => {
    await loadSchedule();
    setScheduleModal(true);
  };

  const renderScheduleModal = () => (
    <Modal visible={scheduleModal} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <UTText variant="title" style={{ flex: 1 }}>My Schedule</UTText>
            <Pressable onPress={() => setScheduleModal(false)}>
              <Ionicons name="close" size={24} color={colors.burntOrange} />
            </Pressable>
          </View>
          
          <ScrollView style={{ maxHeight: 400 }}>
            {scheduleEvents.length > 0 ? (
              scheduleEvents.map((event, index) => (
                <View key={index} style={styles.scheduleItem}>
                  {editingEvent === index ? (
                    // Edit mode
                    <View style={{ flex: 1 }}>
                      <TextInput
                        value={editForm.course}
                        onChangeText={(text) => setEditForm({...editForm, course: text})}
                        placeholder="Course (e.g., CS 311)"
                        style={styles.editInput}
                      />
                      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <TextInput
                          value={editForm.days}
                          onChangeText={(text) => setEditForm({...editForm, days: text})}
                          placeholder="Days (e.g., MWF)"
                          style={[styles.editInput, { flex: 1 }]}
                        />
                        <TextInput
                          value={editForm.start_time}
                          onChangeText={(text) => setEditForm({...editForm, start_time: text})}
                          placeholder="Start (14:00)"
                          style={[styles.editInput, { flex: 1 }]}
                        />
                        <TextInput
                          value={editForm.end_time}
                          onChangeText={(text) => setEditForm({...editForm, end_time: text})}
                          placeholder="End (15:00)"
                          style={[styles.editInput, { flex: 1 }]}
                        />
                      </View>
                      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <TextInput
                          value={editForm.building}
                          onChangeText={(text) => setEditForm({...editForm, building: text})}
                          placeholder="Building (WEL)"
                          style={[styles.editInput, { flex: 1 }]}
                        />
                        <TextInput
                          value={editForm.room}
                          onChangeText={(text) => setEditForm({...editForm, room: text})}
                          placeholder="Room (2.316)"
                          style={[styles.editInput, { flex: 1 }]}
                        />
                      </View>
                      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                        <Pressable onPress={saveEditedEvent} style={[styles.actionBtn, { backgroundColor: '#2ecc71' }]}>
                          <UTText style={{ color: colors.white }}>Save</UTText>
                        </Pressable>
                        <Pressable onPress={cancelEditing} style={[styles.actionBtn, { backgroundColor: colors.slate }]}>
                          <UTText style={{ color: colors.white }}>Cancel</UTText>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    // View mode
                    <>
                      <View style={{ flex: 1 }}>
                        <UTText variant="subtitle">{event.course}</UTText>
                        <UTText variant="meta">
                          {event.days.join('')} • {event.start_time} - {event.end_time}
                        </UTText>
                        <UTText variant="meta">
                          {event.building} {event.room || ''}
                        </UTText>
                      </View>
                      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                        <Pressable onPress={() => startEditingEvent(index)} style={styles.editBtn}>
                          <Ionicons name="pencil-outline" size={18} color={colors.burntOrange} />
                        </Pressable>
                        <Pressable 
                          onPress={() => {
                            Alert.alert(
                              'Delete Class',
                              `Remove ${event.course}?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => deleteScheduleEvent(index) }
                              ]
                            );
                          }}
                          style={styles.deleteBtn}
                        >
                          <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>
              ))
            ) : (
              <View style={{ alignItems: 'center', padding: spacing.xl }}>
                <UTText variant="body" style={{ textAlign: 'center', color: colors.slate }}>
                  No schedule uploaded yet
                </UTText>
              </View>
            )}
          </ScrollView>
          
          <View style={{ marginTop: spacing.md }}>
            <UTButton 
              title="Upload New Schedule" 
              onPress={() => {
                setScheduleModal(false);
                navigation.navigate('UploadSchedule');
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={{ padding: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <UTText variant="subtitle" style={{ color: colors.burntOrange }}>Living</UTText>
        <Ionicons name="walk-outline" size={18} color={colors.burntOrange} />
      </View>

      <MapView ref={mapRef} style={styles.map} initialRegion={region}>
        {guiding ? classMarker : null}
        {!guiding ? roommateMarkers : null}
        {userLoc ? (
          <Marker coordinate={userLoc} title="You">
            <UTPin isRoommate size={20} />
          </Marker>
        ) : null}
        {guiding && routeCoords?.length ? (
          <Polyline coordinates={routeCoords} strokeColor="#FF3B30" strokeWidth={4} />
        ) : null}
      </MapView>

      {ui?.showNextCard !== false ? (
        <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg }}>
          <UTCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <UTText variant="subtitle">Next Class</UTText>
              <Pressable onPress={() => savePrefs?.({ ui: { showNextCard: false } })}>
                <UTText variant="meta" style={{ color: colors.burntOrange }}>Hide</UTText>
              </Pressable>
            </View>
            <UTText variant="meta">
              {nextClass ? `${nextClass.course} • ${nextClass.building} ${nextClass.room || ''} • ${nextClass.start_time}` : 'No upcoming class'}
            </UTText>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              {etaMinutes != null ? (<UTText variant="meta">ETA {etaMinutes} min</UTText>) : null}
              {minsUntil != null ? (<UTText variant="meta" style={{ marginLeft: spacing.md }}>Starts in {minsUntil} min</UTText>) : null}
            </View>
            <View style={{ marginTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between' }}>
              <UTButton title="Refresh" variant="secondary" onPress={refreshNext} style={{ flex: 1, marginRight: spacing.sm }} />
              {nextClass ? (
                <Pressable onPress={onGuideToggle} style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                  <UTText variant="label">{guiding ? 'Stop' : 'Guide Me'}</UTText>
                </Pressable>
              ) : (
                <Pressable onPress={() => navigation.navigate('UploadSchedule')} style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                  <UTText variant="label">Upload Schedule</UTText>
                </Pressable>
              )}
            </View>
            {guiding ? (
              <Pressable onPress={openExternalMaps} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}>
                <UTText variant="label">Open in Maps</UTText>
              </Pressable>
            ) : null}
          </UTCard>
        </View>
      ) : (
        <View style={{ position: 'absolute', right: spacing.lg, bottom: spacing.lg }}>
          <Pressable onPress={() => savePrefs?.({ ui: { showNextCard: true } })} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#EFEFF4', borderRadius: 8 }}>
            <UTText variant="meta" style={{ color: '#2C2C2E' }}>Show Next Class</UTText>
          </Pressable>
        </View>
      )}

      {/* Schedule FAB */}
      <View style={{ position: 'absolute', top: 60, right: spacing.lg }}>
        <Pressable onPress={openScheduleModal} style={styles.scheduleFab}>
          <Ionicons name="calendar-outline" size={20} color={colors.white} />
        </Pressable>
      </View>

      {renderScheduleModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  scheduleFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.burntOrange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deleteBtn: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: '#fff5f5',
  },
  editBtn: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.white,
    fontSize: 14,
  },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
}); 