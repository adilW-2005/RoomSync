import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import useMemberStore from '../../state/useMemberStore';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTButton from '../../components/UTButton';
import { spacing } from '../../styles/theme';

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
    setAmount(''); setNotes(''); setSplit('equal'); setShares({}); setReceiptBase64(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.card}>
          <View style={styles.handleContainer}><View style={styles.handle} /></View>
          <View style={styles.headerRow}>
            <UTText variant="subtitle" style={{ fontSize: 20, fontFamily: 'Poppins_600SemiBold' }}>Add Expense</UTText>
            <TouchableOpacity onPress={onClose}><UTText variant="subtitle" style={{ color: '#BF5700' }}>Close</UTText></TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
              <View style={styles.section}>
                <UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>AMOUNT</UTText>
                <UTInput placeholder="$0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
              </View>

              <View style={styles.section}>
                <UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>NOTES</UTText>
                <UTInput placeholder="Optional" value={notes} onChangeText={setNotes} />
              </View>

              <View style={styles.section}>
                <UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>SPLIT</UTText>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity style={[styles.segmentPill, split === 'equal' ? { backgroundColor: '#BF5700' } : { backgroundColor: '#FFFFFF' }]} onPress={() => setSplit('equal')}>
                    <UTText style={{ color: split === 'equal' ? '#fff' : '#BF5700', fontFamily: 'Poppins_600SemiBold' }}>Equal</UTText>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.segmentPill, split === 'custom' ? { backgroundColor: '#BF5700' } : { backgroundColor: '#FFFFFF' }]} onPress={() => setSplit('custom')}>
                    <UTText style={{ color: split === 'custom' ? '#fff' : '#BF5700', fontFamily: 'Poppins_600SemiBold' }}>Custom</UTText>
                  </TouchableOpacity>
                </View>
              </View>

              {split === 'custom' ? (
                <View style={[styles.section, { marginTop: spacing.sm }]}>
                  {Object.entries(membersById).map(([userId, name]) => (
                    <View style={styles.shareRow} key={userId}>
                      <UTText variant="body" style={{ flex: 1 }}>{name}</UTText>
                      <UTInput keyboardType="decimal-pad" placeholder="0" value={shares[userId] || ''} onChangeText={(v) => onChangeShare(userId, v)} style={{ minWidth: 90 }} />
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.section}>
                <UTText variant="label" style={{ color: 'black', marginBottom: spacing.xs }}>RECEIPT</UTText>
                {receiptBase64 ? <Image source={{ uri: receiptBase64 }} style={styles.receipt} /> : null}
                <TouchableOpacity style={[styles.segmentPill, { backgroundColor: '#FFFFFF', alignSelf: 'flex-start', marginTop: spacing.xs }]} onPress={pickReceipt}>
                  <UTText style={{ color: '#BF5700', fontFamily: 'Poppins_600SemiBold' }}>Add Receipt</UTText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          <View style={styles.footer}> 
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
  card: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.92)', paddingBottom: 84 },
  handleContainer: { alignItems: 'center', paddingTop: 8 },
  handle: { width: 42, height: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.15)' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, marginTop: 6 },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  segmentPill: { height: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 0, alignItems: 'center', justifyContent: 'center' },
  shareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, backgroundColor: 'transparent', flexDirection: 'row' },
  receipt: { width: 64, height: 64, borderRadius: 8 }
}); 