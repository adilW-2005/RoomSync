import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Modal, Image } from 'react-native';
import useInventoryStore from '../../state/useInventoryStore';
import * as ImagePicker from 'expo-image-picker';
import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import FadeSlideIn from '../../components/FadeSlideIn';
import PressableScale from '../../components/PressableScale';
import { spacing, colors } from '../../styles/theme';

export default function InventoryScreen() {
  const { items, fetchItems, createItem, updateItem, deleteItem, loading } = useInventoryStore();
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [shared, setShared] = useState('true');
  const [expiresAt, setExpiresAt] = useState('');
  const [photoBase64, setPhotoBase64] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => { fetchItems(); }, []);

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.7 });
      if (!result?.canceled && result?.assets?.[0]?.base64) setPhotoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    } catch (_) {}
  };

  const submit = async () => {
    await createItem({ name, qty: parseInt(qty, 10) || 1, shared: shared === 'true', expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined, photoBase64 });
    setModal(false); setName(''); setQty('1'); setShared('true'); setExpiresAt(''); setPhotoBase64(null);
  };

  const renderItem = ({ item, index }) => (
    <FadeSlideIn delay={index * 40}>
      <UTCard style={{ marginBottom: spacing.md }}>
        <UTText variant="subtitle">{item.name}</UTText>
        <UTText variant="meta" style={{ marginTop: spacing.xs }}>Qty: {item.qty} {item.shared ? '· Shared' : ''} {item.expiresAt ? `· Expires ${new Date(item.expiresAt).toLocaleDateString()}` : ''}</UTText>
        {item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={{ width: '100%', height: 160, borderRadius: 12, marginTop: spacing.xs }} /> : null}
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
          <UTButton title="+1" variant="secondary" onPress={() => updateItem(item.id, { qty: item.qty + 1 })} style={{ flex: 1 }} />
          {item.qty > 0 ? <UTButton title="-1" variant="secondary" onPress={() => updateItem(item.id, { qty: Math.max(0, item.qty - 1) })} style={{ flex: 1 }} /> : null}
          <UTButton title="Delete" variant="secondary" onPress={() => deleteItem(item.id)} style={{ flex: 1 }} />
        </View>
      </UTCard>
    </FadeSlideIn>
  );

  return (
    <View style={styles.container}>
      <UTText variant="title" style={{ color: colors.burntOrange, marginBottom: spacing.sm }}>Inventory</UTText>
      <UTInput placeholder="Search items" value={q} onChangeText={(t) => { setQ(t); fetchItems({ q: t }); }} style={{ marginBottom: spacing.md }} />
      <FlatList data={items} keyExtractor={(i) => i.id} renderItem={renderItem} refreshing={loading} onRefresh={fetchItems} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} />

      <PressableScale onPress={() => setModal(true)} style={styles.fab}>
        <UTText variant="title" style={{ color: '#fff' }}>+</UTText>
      </PressableScale>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <UTText variant="subtitle" style={{ marginBottom: spacing.sm, textAlign: 'center' }}>Add Item</UTText>
            <UTInput placeholder="Name" value={name} onChangeText={setName} style={{ marginBottom: spacing.md }} />
            <UTInput placeholder="Qty" keyboardType="number-pad" value={qty} onChangeText={setQty} style={{ marginBottom: spacing.md }} />
            <UTInput placeholder="Shared (true|false)" value={shared} onChangeText={setShared} style={{ marginBottom: spacing.md }} />
            <UTInput placeholder="Expires At (YYYY-MM-DD)" value={expiresAt} onChangeText={setExpiresAt} style={{ marginBottom: spacing.md }} />
            {photoBase64 ? <Image source={{ uri: photoBase64 }} style={{ width: 64, height: 64, borderRadius: 8, alignSelf: 'center', marginBottom: spacing.sm }} /> : null}
            <UTButton title="Add Photo" variant="secondary" onPress={pickPhoto} style={{ marginBottom: spacing.md }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <UTButton title="Cancel" variant="secondary" onPress={() => setModal(false)} style={{ flex: 1, marginRight: spacing.sm }} />
              <UTButton title="Create" onPress={submit} style={{ flex: 1, marginLeft: spacing.sm }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: '#F8F8F8' },
  fab: { position: 'absolute', right: 20, bottom: 30, backgroundColor: '#BF5700', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: spacing.lg, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
}); 