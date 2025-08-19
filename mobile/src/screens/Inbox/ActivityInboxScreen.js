import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import FadeSlideIn from '../../components/FadeSlideIn';
import EmptyState from '../../components/EmptyState';
import useChoreStore from '../../state/useChoreStore';
import useExpenseStore from '../../state/useExpenseStore';
import useEventStore from '../../state/useEventStore';
import useHangoutStore from '../../state/useHangoutStore';
import useAuthStore from '../../state/useAuthStore';
import useGroupStore from '../../state/useGroupStore';
import { spacing, colors } from '../../styles/theme';

export default function ActivityInboxScreen({ navigation }) {
  const { openChores, fetchOpen, completeChore } = useChoreStore();
  const { expenses, fetchExpenses } = useExpenseStore();
  const { events, fetchEvents } = useEventStore();
  const { proposals, vote } = useHangoutStore();
  const { user } = useAuthStore();
  const { currentGroup } = useGroupStore();

  useEffect(() => {
    fetchOpen();
    fetchExpenses({ page: 1 });
    fetchEvents();
  }, []);

  const items = useMemo(() => {
    const list = [];
    for (const c of openChores || []) list.push({ id: `chore-${c.id}`, type: 'chore', title: `Chore: ${c.title}`, subtitle: `Due ${new Date(c.dueAt || Date.now()).toLocaleDateString()}`, chore: c });
    for (const e of events || []) list.push({ id: `event-${e.id}`, type: 'event', title: `Event: ${e.title}`, subtitle: new Date(e.startAt).toLocaleString(), event: e });
    for (const x of expenses || []) list.push({ id: `expense-${x.id}`, type: 'expense', title: `Receipt: ${x.title || 'Expense'}`, subtitle: `$${(x.amount || 0).toFixed(2)}`, expense: x });
    for (const p of proposals || []) list.push({ id: `hangout-${p.id}`, type: 'hangout', title: `Hangout: ${p.title}`, subtitle: p.time ? new Date(p.time).toLocaleString() : 'Vote now', proposal: p });
    return list.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }, [openChores, events, expenses, proposals]);

  const renderItem = ({ item, index }) => (
    <FadeSlideIn delay={index * 30}>
      <UTCard style={{ marginBottom: spacing.md }}>
        <UTText variant="subtitle">{item.title}</UTText>
        <UTText variant="meta" style={{ marginTop: 4 }}>{item.subtitle}</UTText>
        {item.type === 'chore' ? (
          <UTButton title="Complete" onPress={() => completeChore(item.chore.id)} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
        ) : item.type === 'event' ? (
          <UTButton title="View" variant="secondary" onPress={() => navigation.navigate('Events')} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
        ) : item.type === 'expense' ? (
          <UTButton title="View" variant="secondary" onPress={() => navigation.navigate('Expenses')} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
        ) : item.type === 'hangout' ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <UTButton title="Yes" onPress={() => vote({ proposalId: item.proposal.id, userId: user?.id, groupId: currentGroup?.id, vote: 'yes' })} />
            <UTButton title="No" variant="secondary" onPress={() => vote({ proposalId: item.proposal.id, userId: user?.id, groupId: currentGroup?.id, vote: 'no' })} />
          </View>
        ) : null}
      </UTCard>
    </FadeSlideIn>
  );

  return (
    <View style={styles.container}>
      <UTText variant="title" style={{ color: colors.burntOrange, marginBottom: spacing.sm }}>Activity</UTText>
      {!items.length ? (
        <EmptyState title="You're all caught up" subtitle="New activity will appear here." />
      ) : (
        <FlatList data={items} keyExtractor={(i) => i.id} renderItem={renderItem} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: '#F8F8F8' },
}); 