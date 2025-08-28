import React from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, SafeAreaView } from 'react-native';
import useGroupStore from '../../state/useGroupStore';
import api from '../../api/client';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import GradientHeader from '../../components/GradientHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { spacing, colors, radii } from '../../styles/theme';

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

  const renderMember = ({ item }) => {
    const initial = (item.name || '?').slice(0,1).toUpperCase();
    return (
      <View style={styles.memberRow}> 
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.memberAvatar}><UTText variant="subtitle" style={{ color: colors.burntOrange }}>{initial}</UTText></View>
          <View style={{ marginLeft: spacing.sm, maxWidth: '70%' }}>
            <UTText variant="body" numberOfLines={1}>{item.name}</UTText>
            <UTText variant="meta" numberOfLines={1}>{item.email}</UTText>
          </View>
        </View>
        <TouchableOpacity onPress={() => onRemove(item.id)} style={styles.smallBtn} accessibilityLabel={`Remove ${item.name}`}>
          <Ionicons name="close" size={16} color={colors.burntOrange} />
          <UTText variant="meta" style={{ color: colors.burntOrange, marginLeft: 6 }}>Remove</UTText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderGroupRow = ({ item }) => (
    <View style={styles.memberRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.memberAvatar, { backgroundColor: '#FFE4D1' }]}><UTText variant="subtitle" style={{ color: colors.burntOrange }}>{(item.name||'?').slice(0,1).toUpperCase()}</UTText></View>
        <UTText variant="body" style={{ marginLeft: spacing.sm }} numberOfLines={1}>{item.name}</UTText>
      </View>
      <TouchableOpacity onPress={() => onSwitch(item.id)} style={styles.smallBtn} accessibilityLabel={`Switch to ${item.name}`}>
        <Ionicons name="swap-horizontal" size={16} color={colors.burntOrange} />
        <UTText variant="meta" style={{ color: colors.burntOrange, marginLeft: 6 }}>Switch</UTText>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <GradientHeader title="Group Settings" rightIcon="options-outline" />
      <View style={styles.container}>
        <View style={styles.cardShadow}>
          <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
            <UTCard style={{ backgroundColor: 'transparent' }}>
              <UTText variant="subtitle" style={{ marginBottom: spacing.xs }}>Name</UTText>
              <TextInput value={name} onChangeText={setName} style={styles.input} />
              <UTButton title="Save Name" onPress={onRename} disabled={saving} style={{ marginTop: spacing.sm }} />
              <UTButton title="Regenerate Join Code" variant="secondary" onPress={onRegen} disabled={saving} style={{ marginTop: spacing.sm }} />
            </UTCard>
          </LinearGradient>
        </View>

        <UTText variant="subtitle" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>Members</UTText>
        <View style={styles.cardShadow}>
          <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
            <UTCard style={{ backgroundColor: 'transparent' }}>
              <FlatList
                data={currentGroup?.members || []}
                keyExtractor={(m) => m.id}
                renderItem={renderMember}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            </UTCard>
          </LinearGradient>
        </View>

        <UTText variant="subtitle" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>Switch Group</UTText>
        <View style={styles.cardShadow}>
          <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
            <UTCard style={{ backgroundColor: 'transparent' }}>
              <FlatList
                data={groups}
                keyExtractor={(g) => g.id}
                renderItem={renderGroupRow}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            </UTCard>
          </LinearGradient>
        </View>

        <UTText variant="subtitle" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>Invites</UTText>
        <View style={styles.cardShadow}>
          <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
            <UTCard style={{ backgroundColor: 'transparent' }}>
              {inviteLink ? <UTText variant="body" style={{ marginBottom: spacing.xs }}>Link: {inviteLink}</UTText> : null}
              <UTButton title="Create Invite" onPress={onCreateInvite} style={{ marginBottom: spacing.sm }} />
              <FlatList
                data={invites}
                keyExtractor={(i) => i.code}
                renderItem={({ item }) => (
                  <View style={styles.memberRow}>
                    <UTText variant="body">{item.code}</UTText>
                    <TouchableOpacity onPress={() => onRevokeInvite(item.code)} style={styles.smallBtn} accessibilityLabel={`Revoke ${item.code}`}>
                      <Ionicons name="trash-outline" size={16} color={colors.burntOrange} />
                      <UTText variant="meta" style={{ color: colors.burntOrange, marginLeft: 6 }}>Revoke</UTText>
                    </TouchableOpacity>
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            </UTCard>
          </LinearGradient>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, paddingHorizontal: spacing.lg },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 12, backgroundColor: '#FFFFFF' },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.xs },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFEFF4', alignItems: 'center', justifyContent: 'center' },
  smallBtn: { flexDirection: 'row', alignItems: 'center', height: 34, paddingHorizontal: 10, borderRadius: 17, borderWidth: 1, borderColor: colors.burntOrange, backgroundColor: '#FFFFFF' },
  cardShadow: { borderRadius: radii.card, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 7 },
  gradientCard: { borderRadius: radii.card, overflow: 'hidden' },
}); 