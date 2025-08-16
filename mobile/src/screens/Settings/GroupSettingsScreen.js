import React from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import useGroupStore from '../../state/useGroupStore';
import api from '../../api/client';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import { spacing, colors } from '../../styles/theme';

export default function GroupSettingsScreen() {
  const { currentGroup, getCurrent, listGroups, switchGroup, createInvite, listInvites, revokeInvite } = useGroupStore();
  const [name, setName] = React.useState(currentGroup?.name || '');
  const [saving, setSaving] = React.useState(false);
  const [groups, setGroups] = React.useState([]);
  const [invites, setInvites] = React.useState([]);
  const [inviteLink, setInviteLink] = React.useState('');

  React.useEffect(() => {
    (async () => {
      const gs = await listGroups();
      setGroups(gs);
      try {
        const inv = await listInvites();
        setInvites(inv);
      } catch (_) {}
    })();
  }, []);

  const onRename = async () => {
    try {
      setSaving(true);
      await api.patch('/groups/current', { name });
      await getCurrent();
      Alert.alert('Group updated');
    } catch (e) {
      Alert.alert('Update failed', e.message || 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const onRegen = async () => {
    try {
      setSaving(true);
      await api.post('/groups/current/regenerate-code');
      await getCurrent();
      Alert.alert('New code generated');
    } catch (e) {
      Alert.alert('Action failed', e.message || 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async (userId) => {
    try {
      setSaving(true);
      await api.post('/groups/current/remove-member', { userId });
      await getCurrent();
      Alert.alert('Member removed');
    } catch (e) {
      Alert.alert('Action failed', e.message || 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const onSwitch = async (groupId) => {
    try {
      await switchGroup(groupId);
      await getCurrent();
      Alert.alert('Switched group');
    } catch (e) {
      Alert.alert('Switch failed', e.message || 'Try again');
    }
  };

  const onCreateInvite = async () => {
    try {
      const res = await createInvite({ expiresInHours: 24 });
      setInviteLink(res.universal || res.link);
      const inv = await listInvites();
      setInvites(inv);
    } catch (e) {
      Alert.alert('Invite failed', e.message || 'Try again');
    }
  };

  const onRevokeInvite = async (code) => {
    try {
      await revokeInvite(code);
      const inv = await listInvites();
      setInvites(inv);
    } catch (e) {
      Alert.alert('Revoke failed', e.message || 'Try again');
    }
  };

  return (
    <View style={styles.container}>
      <UTText variant="title" style={{ color: colors.burntOrange, marginBottom: spacing.sm }}>Group Settings</UTText>
      <UTCard style={{ marginBottom: spacing.md }}>
        <UTText variant="subtitle" style={{ marginBottom: spacing.xs }}>Name</UTText>
        <TextInput value={name} onChangeText={setName} style={styles.input} />
        <UTButton title="Save Name" onPress={onRename} disabled={saving} style={{ marginTop: spacing.sm }} />
        <UTButton title="Regenerate Join Code" variant="secondary" onPress={onRegen} disabled={saving} style={{ marginTop: spacing.sm }} />
      </UTCard>

      <UTText variant="subtitle" style={{ marginBottom: spacing.sm }}>Members</UTText>
      <UTCard style={{ marginBottom: spacing.md }}>
        <FlatList
          data={currentGroup?.members || []}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <UTText variant="body">{item.name} ({item.email})</UTText>
              <UTButton title="Remove" variant="secondary" onPress={() => onRemove(item.id)} />
            </View>
          )}
        />
      </UTCard>

      <UTText variant="subtitle" style={{ marginBottom: spacing.sm }}>Switch Group</UTText>
      <UTCard style={{ marginBottom: spacing.md }}>
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <UTText variant="body">{item.name}</UTText>
              <UTButton title="Switch" variant="secondary" onPress={() => onSwitch(item.id)} />
            </View>
          )}
        />
      </UTCard>

      <UTText variant="subtitle" style={{ marginBottom: spacing.sm }}>Invites</UTText>
      <UTCard>
        {inviteLink ? <UTText variant="body" style={{ marginBottom: spacing.xs }}>Link: {inviteLink}</UTText> : null}
        <UTButton title="Create Invite" onPress={onCreateInvite} style={{ marginBottom: spacing.sm }} />
        <FlatList
          data={invites}
          keyExtractor={(i) => i.code}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <UTText variant="body">{item.code}</UTText>
              <UTButton title="Revoke" variant="secondary" onPress={() => onRevokeInvite(item.code)} />
            </View>
          )}
        />
      </UTCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: '#F8F8F8' },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 12 },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: '#EFEFF4' },
}); 