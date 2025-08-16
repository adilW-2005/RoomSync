import React, { useState } from 'react';
import { Modal, View, StyleSheet } from 'react-native';

import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTButton from '../../components/UTButton';
import { spacing } from '../../styles/theme';

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
          <UTText variant="subtitle" style={{ marginBottom: spacing.sm, textAlign: 'center' }}>Add Chore</UTText>
          <UTInput label="TITLE" placeholder="Title" value={title} onChangeText={setTitle} style={{ marginBottom: spacing.md }} />
          <UTInput label="DUE IN (HOURS)" placeholder="e.g., 24" keyboardType="number-pad" value={hours} onChangeText={setHours} style={{ marginBottom: spacing.md }} />
          <UTInput label="ASSIGNEES" placeholder="User IDs, comma-separated" value={assigneesText} onChangeText={setAssigneesText} style={{ marginBottom: spacing.md }} />
          <UTInput label="REPEAT" placeholder="none|daily|weekly|custom" value={repeat} onChangeText={setRepeat} style={{ marginBottom: spacing.md }} />
          {repeat === 'custom' && (
            <UTInput label="CUSTOM DAYS" placeholder="0=Sun..6=Sat" value={customDays} onChangeText={setCustomDays} style={{ marginBottom: spacing.md }} />
          )}
          <View style={styles.row}>
            <UTButton title="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1, marginRight: spacing.sm }} />
            <UTButton title="Create" onPress={submit} style={{ flex: 1, marginLeft: spacing.sm }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#fff', padding: spacing.lg, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
}); 