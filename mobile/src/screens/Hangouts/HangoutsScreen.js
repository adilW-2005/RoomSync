import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import useHangoutStore from '../../state/useHangoutStore';
import useAuthStore from '../../state/useAuthStore';
import useGroupStore from '../../state/useGroupStore';
import { getSocket } from '../../lib/socket';
import { requestNotificationPermissions, notifyHangoutProposal, notifyHangoutResult } from '../../lib/notifications';

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
      await notifyHangoutProposal({ title: payload.title, time: payload.time, loc: payload.loc });
    };
    const onVote = async (payload) => {
      if (String(payload.groupId) !== String(currentGroup.id)) return;
      applyVote(payload);
      // naive result notification when any proposal crosses yes>no by 2
      const p = (proposals.find((x) => x.id === payload.proposalId) || {});
      const yes = Object.values((p.votes || {})).filter((v) => v === 'yes').length + (payload.vote === 'yes' ? 1 : 0);
      const no = Object.values((p.votes || {})).filter((v) => v === 'no').length + (payload.vote === 'no' ? 1 : 0);
      if (yes - no >= 2) {
        await notifyHangoutResult({ title: p.title || 'Hangout', result: 'Likely happening' });
      }
    };
    socket?.on('hangout:proposal', onProposal);
    socket?.on('hangout:vote', onVote);
    return () => {
      socket?.off('hangout:proposal', onProposal);
      socket?.off('hangout:vote', onVote);
    };
  }, [currentGroup?.id, proposals]);

  const submit = () => {
    if (!currentGroup?.id || !user?.id) return;
    propose({ title, time, authorId: user.id, groupId: currentGroup.id, desc, loc });
    setTitle(''); setTime(''); setDesc(''); setLoc('');
  };

  const renderItem = ({ item }) => {
    const yes = Object.values(item.votes || {}).filter((v) => v === 'yes').length;
    const no = Object.values(item.votes || {}).filter((v) => v === 'no').length;
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.sub}>{item.time} {item.loc ? `· ${item.loc}` : ''}</Text>
        {item.desc ? <Text style={styles.meta}>{item.desc}</Text> : null}
        <Text style={styles.meta}>Yes: {yes} · No: {no}</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.chip} onPress={() => vote({ proposalId: item.id, userId: user.id, groupId: currentGroup.id, vote: 'yes' })}><Text style={styles.chipText}>Yes</Text></TouchableOpacity>
          <TouchableOpacity style={styles.chipOutline} onPress={() => vote({ proposalId: item.id, userId: user.id, groupId: currentGroup.id, vote: 'no' })}><Text style={styles.chipOutlineText}>No</Text></TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Hangouts</Text>
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
        <TextInput style={styles.input} placeholder="Time" value={time} onChangeText={setTime} />
        <TextInput style={styles.input} placeholder="Location (optional)" value={loc} onChangeText={setLoc} />
        <TextInput style={styles.input} placeholder="Description (optional)" value={desc} onChangeText={setDesc} />
        <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>Propose</Text></TouchableOpacity>
      </View>
      <FlatList data={proposals} keyExtractor={(i) => i.id} renderItem={renderItem} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 22, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', marginBottom: 8 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F2D388', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 10, marginBottom: 8 },
  button: { backgroundColor: '#BF5700', borderRadius: 12, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F2D388' },
  title: { fontFamily: 'Poppins_600SemiBold', color: '#222' },
  sub: { fontFamily: 'Poppins_400Regular', color: '#666', marginTop: 4 },
  meta: { fontFamily: 'Poppins_400Regular', color: '#444', marginTop: 6 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  chip: { backgroundColor: '#BF5700', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  chipText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  chipOutline: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#BF5700' },
  chipOutlineText: { color: '#BF5700', fontFamily: 'Poppins_600SemiBold' }
}); 