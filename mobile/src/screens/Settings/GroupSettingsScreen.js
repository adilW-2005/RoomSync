import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import useGroupStore from '../../state/useGroupStore';
import api from '../../api/client';

export default function GroupSettingsScreen() {
  const { currentGroup, getCurrent } = useGroupStore();
  const [name, setName] = React.useState(currentGroup?.name || '');
  const [saving, setSaving] = React.useState(false);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Group Settings</Text>
      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      <TouchableOpacity style={styles.button} onPress={onRename} disabled={saving}>
        <Text style={styles.buttonText}>Save Name</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.buttonSecondary} onPress={onRegen} disabled={saving}>
        <Text style={styles.buttonText}>Regenerate Join Code</Text>
      </TouchableOpacity>
      <Text style={styles.label}>Members</Text>
      <FlatList
        data={currentGroup?.members || []}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <Text style={styles.memberText}>{item.name} ({item.email})</Text>
            <TouchableOpacity style={styles.removeButton} onPress={() => onRemove(item.id)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 22, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', marginBottom: 12 },
  label: { fontFamily: 'Poppins_600SemiBold', color: '#333', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 12, marginTop: 8 },
  button: { backgroundColor: '#BF5700', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  buttonSecondary: { backgroundColor: '#F2D388', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EFEFF4' },
  memberText: { fontFamily: 'Poppins_400Regular' },
  removeButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#BF5700', borderRadius: 8 },
  removeText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
}); 