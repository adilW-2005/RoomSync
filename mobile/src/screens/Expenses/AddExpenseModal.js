import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import useMemberStore from '../../state/useMemberStore';
import * as ImagePicker from 'expo-image-picker';

export default function AddExpenseModal({ visible, onClose, onCreate }) {
  const { membersById } = useMemberStore();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [split, setSplit] = useState('equal'); // 'equal' | 'custom'
  const [shares, setShares] = useState({}); // userId -> amount string
  const [receiptBase64, setReceiptBase64] = useState(null);

  const onChangeShare = (userId, val) => {
    setShares((prev) => ({ ...prev, [userId]: val }));
  };

  const pickReceipt = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.7 });
      if (!result?.canceled && result?.assets?.[0]?.base64) {
        setReceiptBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (_) {}
  };

  const submit = async () => {
    const total = parseFloat(amount);
    if (!total || total <= 0) return;
    if (split === 'custom') {
      const parts = Object.entries(membersById).map(([userId]) => ({ userId, amount: parseFloat(shares[userId] || '0') || 0 }));
      const sum = Number(parts.reduce((acc, p) => acc + p.amount, 0).toFixed(2));
      if (sum !== Number(total.toFixed(2))) {
        Alert.alert('Invalid shares', 'Custom shares must sum to the total amount');
        return;
      }
      await onCreate({ amount: total, split: 'custom', shares: parts, notes, receiptBase64 });
    } else {
      await onCreate({ amount: total, split: 'equal', notes, receiptBase64 });
    }
    setAmount('');
    setNotes('');
    setSplit('equal');
    setShares({});
    setReceiptBase64(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Add Expense</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.toggle, split === 'equal' && styles.toggleActive]} onPress={() => setSplit('equal')}><Text style={[styles.toggleText, split === 'equal' && styles.toggleTextActive]}>Equal</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.toggle, split === 'custom' && styles.toggleActive]} onPress={() => setSplit('custom')}><Text style={[styles.toggleText, split === 'custom' && styles.toggleTextActive]}>Custom</Text></TouchableOpacity>
          </View>
          <TextInput style={styles.input} placeholder="Amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
          <TextInput style={styles.input} placeholder="Notes (optional)" value={notes} onChangeText={setNotes} />
          {split === 'custom' ? (
            <View style={{ marginTop: 8 }}>
              {Object.entries(membersById).map(([userId, name]) => (
                <View style={styles.shareRow} key={userId}>
                  <Text style={styles.shareName}>{name}</Text>
                  <TextInput style={styles.shareInput} keyboardType="decimal-pad" placeholder="0" value={shares[userId] || ''} onChangeText={(v) => onChangeShare(userId, v)} />
                </View>
              ))}
            </View>
          ) : null}
          {receiptBase64 ? <Image source={{ uri: receiptBase64 }} style={styles.receipt} /> : null}
          <View style={styles.row}>
            <TouchableOpacity style={styles.secondary} onPress={pickReceipt}><Text style={styles.secondaryText}>Add Receipt</Text></TouchableOpacity>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>Create</Text></TouchableOpacity>
            </View>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  button: { backgroundColor: '#BF5700', padding: 12, borderRadius: 12, minWidth: 120, alignItems: 'center', marginLeft: 8 },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  cancel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#BF5700' },
  cancelText: { color: '#BF5700', fontFamily: 'Poppins_600SemiBold' },
  toggle: { flex: 1, padding: 10, borderWidth: 1, borderColor: '#BF5700', borderRadius: 10, alignItems: 'center', marginRight: 8 },
  toggleActive: { backgroundColor: '#BF5700' },
  toggleText: { color: '#BF5700', fontFamily: 'Poppins_600SemiBold' },
  toggleTextActive: { color: '#fff' },
  shareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  shareName: { fontFamily: 'Poppins_400Regular', color: '#222', marginRight: 8, flex: 1 },
  shareInput: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, minWidth: 80, textAlign: 'right' },
  secondary: { backgroundColor: '#F2D388', padding: 10, borderRadius: 10 },
  secondaryText: { color: '#333', fontFamily: 'Poppins_600SemiBold' },
  receipt: { width: 64, height: 64, borderRadius: 8 }
}); 