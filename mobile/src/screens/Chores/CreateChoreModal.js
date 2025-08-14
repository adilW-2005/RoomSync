import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function CreateChoreModal({ visible, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState('24');
  const [repeat, setRepeat] = useState('none');
  const [customDays, setCustomDays] = useState('');
  const [assigneesText, setAssigneesText] = useState('');

  const submit = async () => {
    if (!title.trim()) return;
    const h = parseInt(hours, 10) || 24;
    const dueAt = new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
    const assignees = assigneesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const custom = customDays
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6);
    await onCreate({ title: title.trim(), dueAt, assignees, repeat, customDays: custom });
    setTitle('');
    setHours('24');
    setRepeat('none');
    setCustomDays('');
    setAssigneesText('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Add Chore</Text>
          <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
          <TextInput style={styles.input} placeholder="Due in hours (e.g., 24)" keyboardType="number-pad" value={hours} onChangeText={setHours} />
          <TextInput style={styles.input} placeholder="Assignees (user IDs, comma-separated)" value={assigneesText} onChangeText={setAssigneesText} />
          <TextInput style={styles.input} placeholder="Repeat (none|daily|weekly|custom)" value={repeat} onChangeText={setRepeat} />
          {repeat === 'custom' && (
            <TextInput style={styles.input} placeholder="Custom days (0=Sun..6=Sat, comma-separated)" value={customDays} onChangeText={setCustomDays} />
          )}
          <View style={styles.row}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>Create</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  title: { fontSize: 18, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 12, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  button: { backgroundColor: '#BF5700', padding: 12, borderRadius: 12, minWidth: 120, alignItems: 'center' },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  cancel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#BF5700' },
  cancelText: { color: '#BF5700', fontFamily: 'Poppins_600SemiBold' }
}); 