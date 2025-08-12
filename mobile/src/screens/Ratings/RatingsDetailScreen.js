import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import api from '../../api/client';

export default function RatingsDetailScreen({ route }) {
  const { place } = route.params;
  const [items, setItems] = useState([]);
  const [stars, setStars] = useState('5');
  const [tips, setTips] = useState('');

  const fetchItems = async () => {
    const list = await api.get(`/ratings/by-place?placeId=${place.placeId}`);
    setItems(list);
  };

  useEffect(() => { fetchItems(); }, []);

  const submit = async () => {
    try {
      const payload = { kind: 'apartment', placeId: place.placeId, placeName: place.placeName, stars: Number(stars), pros: [], cons: [], tips };
      await api.post('/ratings', payload);
      setStars('5');
      setTips('');
      await fetchItems();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to add review');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{place.placeName}</Text>
      <FlatList
        style={{ flex: 1 }}
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{'★'.repeat(item.stars)}{'☆'.repeat(5 - item.stars)}</Text>
            {item.tips ? <Text style={styles.text}>{item.tips}</Text> : null}
          </View>
        )}
      />
      <View style={styles.form}>
        <Text style={styles.formHeader}>Add Review</Text>
        <TextInput style={styles.input} placeholder="Stars (1-5)" keyboardType="number-pad" value={stars} onChangeText={setStars} />
        <TextInput style={styles.input} placeholder="Tips (optional)" value={tips} onChangeText={setTips} />
        <TouchableOpacity style={styles.button} onPress={submit}><Text style={styles.buttonText}>Submit</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 22, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F2D388' },
  title: { fontFamily: 'Poppins_600SemiBold', color: '#222' },
  text: { fontFamily: 'Poppins_400Regular', color: '#444', marginTop: 6 },
  form: { borderTopWidth: 1, borderTopColor: '#eee', padding: 16 },
  formHeader: { fontFamily: 'Poppins_600SemiBold', color: '#BF5700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#BF5700', padding: 12, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
}); 