import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput } from 'react-native';
import useInventoryStore from '../../state/useInventoryStore';

export default function InventoryScreen() {
  const { items, fetchItems, createItem, updateItem, loading } = useInventoryStore();
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [shared, setShared] = useState('true');

  useEffect(() => { fetchItems(); }, []);

  const submit = async () => {
    await createItem({ name, qty: parseInt(qty, 10) || 1, shared: shared === 'true' });
    setModal(false); setName(''); setQty('1'); setShared('true');
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.sub}>Qty: {item.qty} {item.shared ? '· Shared' : ''}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <TouchableOpacity style={styles.chip} onPress={() => updateItem(item.id, { qty: item.qty + 1 })}><Text style={styles.chipText}>+1</Text></TouchableOpacity>
        {item.qty > 0 ? <TouchableOpacity style={styles.chip} onPress={() => updateItem(item.id, { qty: Math.max(0, item.qty - 1) })}><Text style={styles.chipText}>-1</Text></TouchableOpacity> : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Inventory</Text>
      <FlatList data={items} keyExtractor={(i) => i.id} renderItem={renderItem} refreshing={loading} onRefresh={fetchItems} />
      <TouchableOpacity style={styles.fab} onPress={() => setModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add Item</Text>
            <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Qty" keyboardType="number-pad" value={qty} onChangeText={setQty} />
            <TextInput style={styles.input} placeholder="Shared (true|false)" value={shared} onChangeText={setShared} />
            <View style={styles.row}>
              <TouchableOpacity style={[styles.button, styles.cancel]} onPress={() => setModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 22, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F2D388' },
  title: { fontFamily: 'Poppins_600SemiBold', color: '#222' },
  sub: { fontFamily: 'Poppins_400Regular', color: '#666', marginTop: 4 },
  chip: { backgroundColor: '#BF5700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  chipText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  fab: { position: 'absolute', right: 20, bottom: 30, backgroundColor: '#BF5700', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 28, fontFamily: 'Poppins_600SemiBold' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetTitle: { fontSize: 18, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  button: { backgroundColor: '#BF5700', padding: 12, borderRadius: 12, minWidth: 120, alignItems: 'center' },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  cancel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#BF5700' },
  cancelText: { color: '#BF5700', fontFamily: 'Poppins_600SemiBold' }
}); 