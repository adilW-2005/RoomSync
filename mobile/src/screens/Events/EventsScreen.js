import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import useEventStore from '../../state/useEventStore';
import { scheduleEventReminder, scheduleEventReminderOneHour } from '../../lib/notifications';
import MapView, { Marker } from 'react-native-maps';
import EmptyState from '../../components/EmptyState';
import SkeletonList from '../../components/SkeletonList';

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
      <Text style={styles.header}>Events</Text>
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
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.sub}>{new Date(item.startAt).toLocaleString()} - {new Date(item.endAt).toLocaleString()}</Text>
              {item.locationText ? <Text style={styles.text}>{item.locationText}</Text> : null}
              {typeof item.lat === 'number' && typeof item.lng === 'number' ? (
                <MapView style={styles.map} initialRegion={{ latitude: item.lat, longitude: item.lng, latitudeDelta: 0.002, longitudeDelta: 0.002 }}>
                  <Marker coordinate={{ latitude: item.lat, longitude: item.lng }} />
                </MapView>
              ) : null}
            </View>
          )}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add Event</Text>
            <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
            <TextInput style={styles.input} placeholder="Start (YYYY-MM-DD HH:mm)" value={start} onChangeText={setStart} />
            <TextInput style={styles.input} placeholder="End (YYYY-MM-DD HH:mm)" value={end} onChangeText={setEnd} />
            <TextInput style={styles.input} placeholder="Location (optional)" value={locationText} onChangeText={setLocationText} />
            <TextInput style={styles.input} placeholder="Lat (optional)" value={lat} onChangeText={setLat} keyboardType="decimal-pad" />
            <TextInput style={styles.input} placeholder="Lng (optional)" value={lng} onChangeText={setLng} keyboardType="decimal-pad" />
            <TextInput style={styles.input} placeholder="Repeat (none|daily|weekly|custom)" value={repeat} onChangeText={setRepeat} />
            {repeat === 'custom' && (
              <TextInput style={styles.input} placeholder="Custom days (0=Sun..6=Sat, comma-separated)" value={customDays} onChangeText={setCustomDays} />
            )}
            <View style={styles.row}>
              <TouchableOpacity style={[styles.button, styles.cancel]} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 22, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F2D388' },
  title: { fontFamily: 'Poppins_600SemiBold', color: '#222' },
  sub: { fontFamily: 'Poppins_400Regular', color: '#666', marginTop: 4 },
  text: { fontFamily: 'Poppins_400Regular', color: '#444', marginTop: 6 },
  map: { height: 120, borderRadius: 12, marginTop: 8 },
  fab: { position: 'absolute', right: 20, bottom: 30, backgroundColor: '#BF5700', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 28, fontFamily: 'Poppins_600SemiBold' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetTitle: { fontSize: 18, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  button: { backgroundColor: '#BF5700', padding: 12, borderRadius: 12, minWidth: 120, alignItems: 'center' },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  cancel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#BF5700' },
  cancelText: { color: '#BF5700', fontFamily: 'Poppins_600SemiBold' }
}); 