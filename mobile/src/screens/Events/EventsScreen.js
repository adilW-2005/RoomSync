import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import useEventStore from '../../state/useEventStore';
import { scheduleEventReminder } from '../../lib/notifications';

export default function EventsScreen() {
  const { events, fetchEvents, createEvent, loading } = useEventStore();
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [locationText, setLocationText] = useState('');

  useEffect(() => { fetchEvents(); }, []);

  const submit = async () => {
    try {
      if (!title || !start || !end) return;
      const created = await createEvent({ title, startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString(), locationText });
      await scheduleEventReminder({ title: created.title, startAt: created.startAt });
      setModal(false);
      setTitle(''); setStart(''); setEnd(''); setLocationText('');
    } catch (e) { Alert.alert('Error', e.message || 'Failed to create'); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Events</Text>
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
          </View>
        )}
      />
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