import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import useHangoutStore from '../../state/useHangoutStore';
import useAuthStore from '../../state/useAuthStore';
import useGroupStore from '../../state/useGroupStore';
import { getSocket } from '../../lib/socket';
import { requestNotificationPermissions, notifyHangoutProposal, notifyHangoutResult } from '../../lib/notifications';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import { spacing, colors } from '../../styles/theme';

export default function HangoutsScreen() {
  const { user } = useAuthStore();
  const { currentGroup } = useGroupStore();
  const { proposals, addProposal, applyVote, propose, vote } = useHangoutStore();
  const [title, setTitle] = useState('Coffee at Jester?');
  const [time, setTime] = useState('Tonight 7pm');
  const [desc, setDesc] = useState('');
  const [loc, setLoc] = useState('Jester Lobby');

  useEffect(() => { requestNotificationPermissions(); }, []);

  useEffect(() => {
    if (!currentGroup?.id) return;
    const socket = getSocket();
    const onProposal = async (payload) => {
      if (String(payload.groupId) !== String(currentGroup.id)) return;
      addProposal(payload);
      // Only notify if the proposal is from someone else
      if (String(payload.authorId) !== String(user?.id)) {
        await notifyHangoutProposal({ title: payload.title, time: payload.time, loc: payload.loc });
      }
    };
    const onVote = async (payload) => {
      if (String(payload.groupId) !== String(currentGroup.id)) return;
      applyVote(payload);
      const p = (proposals.find((x) => x.id === payload.proposalId) || {});
      const yes = Object.values((p.votes || {})).filter((v) => v === 'yes').length + (payload.vote === 'yes' ? 1 : 0);
      const no = Object.values((p.votes || {})).filter((v) => v === 'no').length + (payload.vote === 'no' ? 1 : 0);
      if (yes - no >= 2) {
        // Only notify if this vote wasn't by self to avoid duplicate local notifs
        if (String(payload.userId) !== String(user?.id)) {
          await notifyHangoutResult({ title: p.title || 'Hangout', result: 'Likely happening' });
        }
      }
    };
    // Remove existing handlers first to avoid duplicates on re-render
    try { socket?.off('hangout:proposal', onProposal); socket?.off('hangout:vote', onVote); } catch (_) {}
    socket?.on('hangout:proposal', onProposal);
    socket?.on('hangout:vote', onVote);
    return () => {
      socket?.off('hangout:proposal', onProposal);
      socket?.off('hangout:vote', onVote);
    };
  }, [currentGroup?.id, proposals, user?.id]);

  const submit = () => {
    if (!currentGroup?.id || !user?.id) return;
    propose({ title, time, authorId: user.id, groupId: currentGroup.id, desc, loc });
    setTitle(''); setTime(''); setDesc(''); setLoc('');
  };

  const renderItem = ({ item }) => {
    const yes = Object.values(item.votes || {}).filter((v) => v === 'yes').length;
    const no = Object.values(item.votes || {}).filter((v) => v === 'no').length;
    return (
      <UTCard style={{ marginBottom: spacing.md }}>
        <UTText variant="subtitle">{item.title}</UTText>
        <UTText variant="meta">{item.time} {item.loc ? `· ${item.loc}` : ''}</UTText>
        {item.desc ? <UTText variant="body" style={{ marginTop: spacing.xs }}>{item.desc}</UTText> : null}
        <UTText variant="meta" style={{ marginTop: spacing.xs }}>Yes: {yes} · No: {no}</UTText>
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
          <UTButton title="Yes" variant="secondary" onPress={() => vote({ proposalId: item.id, userId: user.id, groupId: currentGroup.id, vote: 'yes' })} style={{ flex: 1 }} />
          <UTButton title="No" variant="secondary" onPress={() => vote({ proposalId: item.id, userId: user.id, groupId: currentGroup.id, vote: 'no' })} style={{ flex: 1 }} />
        </View>
      </UTCard>
    );
  };

  return (
    <View style={styles.container}>
      <UTText variant="title" style={{ color: colors.burntOrange, marginBottom: spacing.sm }}>Hangouts</UTText>
      <UTCard style={{ marginBottom: spacing.md }}>
        <UTText variant="subtitle" style={{ marginBottom: spacing.sm }}>Propose</UTText>
        <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
        <TextInput style={styles.input} placeholder="Time" value={time} onChangeText={setTime} />
        <TextInput style={styles.input} placeholder="Location (optional)" value={loc} onChangeText={setLoc} />
        <TextInput style={styles.input} placeholder="Description (optional)" value={desc} onChangeText={setDesc} />
        <UTButton title="Propose" onPress={submit} />
      </UTCard>
      <FlatList data={proposals} keyExtractor={(i) => i.id} renderItem={renderItem} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: '#F8F8F8' },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 10, marginBottom: spacing.xs },
}); 