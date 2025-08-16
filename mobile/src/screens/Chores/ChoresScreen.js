import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Switch } from 'react-native';
import useChoreStore from '../../state/useChoreStore';
import CreateChoreModal from './CreateChoreModal';
import { scheduleChoreReminder } from '../../lib/notifications';
import useAuthStore from '../../state/useAuthStore';
import EmptyState from '../../components/EmptyState';
import SkeletonList from '../../components/SkeletonList';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import FadeSlideIn from '../../components/FadeSlideIn';
import PressableScale from '../../components/PressableScale';
import { spacing, colors } from '../../styles/theme';

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

  const renderGroup = ({ item, index }) => {
    const sample = item.items[0];
    return (
      <FadeSlideIn delay={index * 40}>
        <UTCard style={{ marginBottom: spacing.md }}>
          <UTText variant="subtitle" style={{ marginBottom: spacing.xs }}>
            {sample.title} {sample.repeat !== 'none' ? `(repeating)` : ''}
          </UTText>
          {item.items.map((c) => (
            <View key={c.id} style={styles.rowBetween}>
              <UTText variant="meta">{new Date(c.dueAt).toLocaleString()}</UTText>
              <UTButton title="Complete" onPress={() => completeChore(c.id)} style={{ height: 40, paddingHorizontal: spacing.md }} />
            </View>
          ))}
        </UTCard>
      </FadeSlideIn>
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
        <UTText variant="title" style={{ color: colors.burntOrange }}>Open Chores</UTText>
        <View style={styles.mineToggle}>
          <UTText variant="meta" style={{ marginRight: spacing.xs }}>My Chores</UTText>
          <Switch value={mineOnly} onValueChange={setMineOnly} />
        </View>
      </View>
      {loading ? (
        <SkeletonList />
      ) : grouped.length === 0 ? (
        <EmptyState title="No chores" subtitle="No chores yet — let’s keep it that way 🤘" />
      ) : (
        <FlatList data={grouped} keyExtractor={(i) => i.key} renderItem={renderGroup} refreshing={loading} onRefresh={fetchOpen} />
      )}
      <PressableScale onPress={() => setModal(true)} style={styles.fab}>
        <UTText variant="title" style={styles.fabPlus}>+</UTText>
      </PressableScale>
      <CreateChoreModal visible={modal} onClose={() => setModal(false)} onCreate={onCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: '#F8F8F8' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  mineToggle: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  fab: { position: 'absolute', right: 20, bottom: 30, backgroundColor: '#BF5700', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
  fabPlus: { color: '#fff', lineHeight: 28 },
}); 