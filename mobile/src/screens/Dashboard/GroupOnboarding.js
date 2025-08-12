import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import useGroupStore from '../../state/useGroupStore';

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
    <View style={styles.container}>
      <Text style={styles.header}>Create a Group</Text>
      <TextInput style={styles.input} placeholder="Group name" value={groupName} onChangeText={setGroupName} />
      <TouchableOpacity style={styles.button} onPress={onCreate} disabled={loading}>
        <Text style={styles.buttonText}>Create</Text>
      </TouchableOpacity>

      <View style={{ height: 24 }} />

      <Text style={styles.header}>Join with Code</Text>
      <TextInput style={styles.input} placeholder="e.g., AB12CD" value={code} onChangeText={setCode} autoCapitalize="characters" maxLength={6} />
      <TouchableOpacity style={styles.buttonSecondary} onPress={onJoin} disabled={loading}>
        <Text style={styles.buttonSecondaryText}>Join</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F2D388', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8 },
  header: { fontSize: 18, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#BF5700', padding: 12, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  buttonSecondary: { backgroundColor: '#fff', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#BF5700' },
  buttonSecondaryText: { color: '#BF5700', fontFamily: 'Poppins_600SemiBold' }
}); 