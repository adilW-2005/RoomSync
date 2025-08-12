import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import useChoreStore from '../../state/useChoreStore';
import CreateChoreModal from './CreateChoreModal';
import { scheduleChoreReminder } from '../../lib/notifications';

export default function ChoresScreen() {
  const { openChores, fetchOpen, completeChore, createChore, loading } = useChoreStore();
  const [modal, setModal] = useState(false);

  useEffect(() => { fetchOpen(); }, []);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.sub}>{new Date(item.dueAt).toLocaleString()}</Text>
      <TouchableOpacity style={styles.button} onPress={() => completeChore(item.id)}>
        <Text style={styles.buttonText}>Complete</Text>
      </TouchableOpacity>
    </View>
  );

  const onCreate = async (payload) => {
    const created = await createChore(payload);
    await fetchOpen();
    await scheduleChoreReminder({ title: created.title, dueAt: created.dueAt });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Open Chores</Text>
      <FlatList data={openChores} keyExtractor={(i) => i.id} renderItem={renderItem} refreshing={loading} onRefresh={fetchOpen} />
      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <CreateChoreModal visible={modal} onClose={() => setModal(false)} onCreate={onCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 22, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, borderWidth: 1, borderColor: '#F2D388' },
  title: { fontFamily: 'Poppins_600SemiBold', color: '#222' },
  sub: { fontFamily: 'Poppins_400Regular', color: '#666', marginTop: 4 },
  button: { alignSelf: 'flex-start', marginTop: 10, backgroundColor: '#BF5700', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  fab: { position: 'absolute', right: 20, bottom: 30, backgroundColor: '#BF5700', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 28, fontFamily: 'Poppins_600SemiBold' }
}); 