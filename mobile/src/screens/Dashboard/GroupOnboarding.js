import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import useGroupStore from '../../state/useGroupStore';
import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTButton from '../../components/UTButton';
import UTCard from '../../components/UTCard';
import { spacing } from '../../styles/theme';

export default function GroupOnboarding() {
  const { createGroup, joinGroup } = useGroupStore();
  const [groupName, setGroupName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const onCreate = async () => {
    if (!groupName.trim()) return Alert.alert('Enter a group name');
    setLoading(true);
    try {
      await createGroup(groupName.trim());
      Alert.alert('Group created');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not create group');
    } finally {
      setLoading(false);
    }
  };

  const onJoin = async () => {
    if (!code.trim()) return Alert.alert('Enter a code');
    setLoading(true);
    try {
      await joinGroup(code.trim().toUpperCase());
      Alert.alert('Joined group');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not join group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <UTCard>
      <UTText variant="subtitle" style={{ marginBottom: spacing.sm }}>Create a Group</UTText>
      <UTInput placeholder="Group name" value={groupName} onChangeText={setGroupName} style={{ marginBottom: spacing.md }} />
      <UTButton title="Create" onPress={onCreate} disabled={loading} />

      <View style={{ height: spacing.lg }} />

      <UTText variant="subtitle" style={{ marginBottom: spacing.sm }}>Join with Code</UTText>
      <UTInput placeholder="e.g., AB12CD" value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={6} style={{ marginBottom: spacing.md }} />
      <UTButton title="Join" variant="secondary" onPress={onJoin} disabled={loading} />
    </UTCard>
  );
}

const styles = StyleSheet.create({}); 