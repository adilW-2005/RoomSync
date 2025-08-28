import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
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
import useNotificationStore from '../../state/useNotificationStore';
import { spacing, colors } from '../../styles/theme';

export default function ActivityInboxScreen({ navigation }) {
  const { openChores, fetchOpen, completeChore } = useChoreStore();
  const { expenses, fetchExpenses } = useExpenseStore();
  const { events, fetchEvents } = useEventStore();
  const { proposals, vote } = useHangoutStore();
  const { user } = useAuthStore();
  const { currentGroup } = useGroupStore();
  const { items, hydrate, markRead, markAllRead, navigateByDeeplink, refreshUnreadCount } = useNotificationStore();

  useEffect(() => {
    hydrate();
  }, []);

  const renderItem = ({ item, index }) => (
    <FadeSlideIn delay={index * 30}>
      <UTCard style={{ marginBottom: spacing.md }}>
        <TouchableOpacity onPress={async () => {
          await markRead(item.id).catch(() => {});
          navigateByDeeplink(navigation, item.deeplink, item.data);
          refreshUnreadCount().catch(() => {});
        }}>
          <UTText variant="subtitle" style={{ color: item.readAt ? undefined : colors.burntOrange }}>{item.title}</UTText>
          <UTText variant="meta" style={{ marginTop: 4 }}>{item.body}</UTText>
        </TouchableOpacity>
      </UTCard>
    </FadeSlideIn>
  );

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <UTText variant="title" style={{ color: colors.burntOrange }}>Inbox</UTText>
        <UTButton variant="secondary" title="Mark all read" onPress={markAllRead} />
      </View>
      {!items.length ? (
        <EmptyState title="You're all caught up" subtitle="New activity will appear here." />
      ) : (
        <FlatList data={items} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: '#F8F8F8' },
}); 