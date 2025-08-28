import React, { useEffect } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import EmptyState from '../../components/EmptyState';
import useMessageStore from '../../state/useMessageStore';
import useMemberStore from '../../state/useMemberStore';
import useAuthStore from '../../state/useAuthStore';
import { spacing, colors } from '../../styles/theme';

function formatTime(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return ''; }
}

export default function MessagesListScreen({ navigation }) {
  const { conversations, hydrate, unreadTotal } = useMessageStore();
  const { membersById, fetchCurrentGroupMembers } = useMemberStore();
  const { user } = useAuthStore();

  useEffect(() => { hydrate(); fetchCurrentGroupMembers().catch(() => {}); }, []);

  const renderItem = ({ item, index }) => {
    const other = item.participants.find((p) => String(p.userId) !== String(user?.id));
    const otherName = membersById[other?.userId] || 'Roommate';
    const you = item.participants.find((p) => String(p.userId) === String(user?.id));
    const unread = you?.unreadCount || 0;
    return (
      <TouchableOpacity onPress={() => navigation.navigate('Conversation', { conversationId: item.id })}>
        <UTCard style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.avatar}><UTText variant="subtitle" style={{ color: colors.burntOrange }}>{String(otherName).slice(0,1).toUpperCase()}</UTText></View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <UTText variant="subtitle">{otherName}</UTText>
              <UTText variant="meta" numberOfLines={1} style={{ marginTop: 2, color: '#6B7280' }}>{item.lastMessage?.text || 'Photo'}</UTText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <UTText variant="meta" style={{ color: '#6B7280' }}>{formatTime(item.updatedAt)}</UTText>
              {unread > 0 ? (
                <View style={styles.badge}><UTText variant="label" style={{ color: 'white', fontSize: 10 }}>{unread}</UTText></View>
              ) : null}
            </View>
          </View>
        </UTCard>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <UTText variant="title" style={{ color: colors.burntOrange, marginBottom: spacing.sm }}>Messages</UTText>
      {!conversations.length ? (
        <EmptyState title="No conversations" subtitle="Message a roommate or a seller to start chatting." />
      ) : (
        <FlatList data={conversations} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: '#F8F8F8' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFE4D1', alignItems: 'center', justifyContent: 'center' },
  badge: { backgroundColor: colors.burntOrange, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 4 },
}); 