import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch } from 'react-native';
import useChoreStore from '../../state/useChoreStore';
import CreateChoreModal from './CreateChoreModal';
import { scheduleChoreReminder } from '../../lib/notifications';
import useAuthStore from '../../state/useAuthStore';
import EmptyState from '../../components/EmptyState';
import SkeletonList from '../../components/SkeletonList';

export default function ChoresScreen() {
  const { openChores, fetchOpen, completeChore, createChore, loading } = useChoreStore();
  const { user } = useAuthStore();
  const [modal, setModal] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);

  useEffect(() => { fetchOpen(); }, []);

  const choresFiltered = useMemo(() => {
    let list = openChores || [];
    if (mineOnly && user?.id) {
      list = list.filter(c => Array.isArray(c.assignees) && c.assignees.includes(user.id));
    }
    return list;
  }, [openChores, mineOnly, user?.id]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const c of choresFiltered) {
      const key = `${c.title}|${c.repeat}|${(c.customDays||[]).join(',')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [choresFiltered]);

  const renderGroup = ({ item }) => {
    const sample = item.items[0];
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{sample.title} {sample.repeat !== 'none' ? `(repeating)` : ''}</Text>
        {item.items.map((c) => (
          <View key={c.id} style={styles.rowBetween}>
            <Text style={styles.sub}>{new Date(c.dueAt).toLocaleString()}</Text>
            <TouchableOpacity style={styles.button} onPress={() => completeChore(c.id)}>
              <Text style={styles.buttonText}>Complete</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const onCreate = async (payload) => {
    const created = await createChore(payload);
    await fetchOpen();
    await scheduleChoreReminder({ title: created.title, dueAt: created.dueAt });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Open Chores</Text>
        <View style={styles.mineToggle}>
          <Text style={styles.toggleText}>My Chores</Text>
          <Switch value={mineOnly} onValueChange={setMineOnly} />
        </View>
      </View>
      {loading ? (
        <SkeletonList />
      ) : grouped.length === 0 ? (
        <EmptyState title="No chores" subtitle="You’re all caught up." />
      ) : (
        <FlatList data={grouped} keyExtractor={(i) => i.key} renderItem={renderGroup} refreshing={loading} onRefresh={fetchOpen} />
      )}
      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <CreateChoreModal visible={modal} onClose={() => setModal(false)} onCreate={onCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 22, color: '#BF5700', fontFamily: 'Poppins_600SemiBold' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mineToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleText: { fontFamily: 'Poppins_400Regular', marginRight: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, borderWidth: 1, borderColor: '#F2D388' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  title: { fontFamily: 'Poppins_600SemiBold', color: '#222' },
  sub: { fontFamily: 'Poppins_400Regular', color: '#666' },
  button: { alignSelf: 'flex-start', backgroundColor: '#BF5700', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  fab: { position: 'absolute', right: 20, bottom: 30, backgroundColor: '#BF5700', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 28, fontFamily: 'Poppins_600SemiBold' }
}); 