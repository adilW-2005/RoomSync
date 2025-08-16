import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Modal, Alert } from 'react-native';
import useEventStore from '../../state/useEventStore';
import { scheduleEventReminder, scheduleEventReminderOneHour } from '../../lib/notifications';
import MapView, { Marker } from 'react-native-maps';
import EmptyState from '../../components/EmptyState';
import SkeletonList from '../../components/SkeletonList';
import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import FadeSlideIn from '../../components/FadeSlideIn';
import PressableScale from '../../components/PressableScale';
import { spacing, colors } from '../../styles/theme';

export default function EventsScreen() {
  const { events, fetchEvents, createEvent, loading } = useEventStore();
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [locationText, setLocationText] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [repeat, setRepeat] = useState('none');
  const [customDays, setCustomDays] = useState('');

  useEffect(() => { fetchEvents(); }, []);

  const submit = async () => {
    try {
      if (!title || !start || !end) return;
      const payload = {
        title,
        startAt: new Date(start).toISOString(),
        endAt: new Date(end).toISOString(),
        locationText,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
        repeat,
        customDays: customDays.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !Number.isNaN(n))
      };
      const created = await createEvent(payload);
      await scheduleEventReminder({ title: created.title, startAt: created.startAt });
      await scheduleEventReminderOneHour({ title: created.title, startAt: created.startAt });
      setModal(false);
      setTitle(''); setStart(''); setEnd(''); setLocationText(''); setLat(''); setLng(''); setRepeat('none'); setCustomDays('');
    } catch (e) { Alert.alert('Error', e.message || 'Failed to create'); }
  };

  return (
    <View style={styles.container}>
      <UTText variant="title" style={{ color: colors.burntOrange, marginBottom: spacing.sm }}>Events</UTText>
      {loading ? (
        <SkeletonList />
      ) : (events || []).length === 0 ? (
        <EmptyState title="No events" subtitle="Create the first event for your group." />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(i) => i.id}
          refreshing={loading}
          onRefresh={fetchEvents}
          renderItem={({ item, index }) => (
            <FadeSlideIn delay={index * 40}>
              <UTCard style={{ marginBottom: spacing.md }}>
                <UTText variant="subtitle">{item.title}</UTText>
                <UTText variant="meta" style={{ marginTop: 4 }}>{new Date(item.startAt).toLocaleString()} - {new Date(item.endAt).toLocaleString()}</UTText>
                {item.locationText ? <UTText variant="meta" style={{ marginTop: 6 }}>{item.locationText}</UTText> : null}
                {typeof item.lat === 'number' && typeof item.lng === 'number' ? (
                  <MapView style={styles.map} initialRegion={{ latitude: item.lat, longitude: item.lng, latitudeDelta: 0.002, longitudeDelta: 0.002 }}>
                    <Marker coordinate={{ latitude: item.lat, longitude: item.lng }} />
                  </MapView>
                ) : null}
              </UTCard>
            </FadeSlideIn>
          )}
        />
      )}
      <PressableScale onPress={() => setModal(true)}>
        <UTButton title="Add Event" onPress={() => setModal(true)} style={{ marginTop: spacing.md }} />
      </PressableScale>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <UTText variant="subtitle" style={{ marginBottom: spacing.sm, textAlign: 'center' }}>Add Event</UTText>
            <UTInput placeholder="Title" value={title} onChangeText={setTitle} style={{ marginBottom: spacing.md }} />
            <UTInput placeholder="Start (YYYY-MM-DD HH:mm)" value={start} onChangeText={setStart} style={{ marginBottom: spacing.md }} />
            <UTInput placeholder="End (YYYY-MM-DD HH:mm)" value={end} onChangeText={setEnd} style={{ marginBottom: spacing.md }} />
            <UTInput placeholder="Location (optional)" value={locationText} onChangeText={setLocationText} style={{ marginBottom: spacing.md }} />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <UTInput placeholder="Lat (optional)" value={lat} onChangeText={setLat} keyboardType="decimal-pad" style={{ flex: 1 }} />
              <UTInput placeholder="Lng (optional)" value={lng} onChangeText={setLng} keyboardType="decimal-pad" style={{ flex: 1 }} />
            </View>
            <UTInput placeholder="Repeat (none|daily|weekly|custom)" value={repeat} onChangeText={setRepeat} style={{ marginTop: spacing.md, marginBottom: spacing.md }} />
            {repeat === 'custom' && (
              <UTInput placeholder="Custom days (0=Sun..6=Sat, comma-separated)" value={customDays} onChangeText={setCustomDays} style={{ marginBottom: spacing.md }} />
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <UTButton title="Cancel" variant="secondary" onPress={() => setModal(false)} style={{ flex: 1, marginRight: spacing.sm }} />
              <UTButton title="Create" onPress={submit} style={{ flex: 1, marginLeft: spacing.sm }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: '#F8F8F8' },
  map: { height: 120, borderRadius: 12, marginTop: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: spacing.lg, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
}); 