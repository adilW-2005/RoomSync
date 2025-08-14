import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import api from '../../api/client';
import * as ImagePicker from 'expo-image-picker';
import useAuthStore from '../../state/useAuthStore';

export default function RatingsDetailScreen({ route }) {
  const { place } = route.params;
  const [items, setItems] = useState([]);
  const [stars, setStars] = useState('5');
  const [tips, setTips] = useState('');
  const [photosBase64, setPhotosBase64] = useState([]);
  const { user } = useAuthStore.getState();

  const fetchItems = async () => {
    const list = await api.get(`/ratings/by-place?placeId=${place.placeId}`);
    setItems(list);
  };

  useEffect(() => { fetchItems(); }, []);

  const pickPhotos = async () => {
    try {
      const pick = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, base64: true, mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      const arr = [];
      if (pick?.assets?.length) {
        for (const a of pick.assets) if (a.base64) arr.push(`data:image/jpeg;base64,${a.base64}`);
      }
      setPhotosBase64(arr);
    } catch (_) {}
  };

  const submit = async () => {
    try {
      const payload = { kind: 'apartment', placeId: place.placeId, placeName: place.placeName, stars: Number(stars), pros: [], cons: [], tips, photos: [], photosBase64 };
      await api.post('/ratings', payload);
      setStars('5');
      setTips('');
      setPhotosBase64([]);
      await fetchItems();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to add review');
    }
  };

  const onDelete = async (id) => {
    try { await api.delete(`/ratings/${id}`); await fetchItems(); } catch (e) { Alert.alert('Error', e.message || 'Failed'); }
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {(item.photos || []).map((u) => (
                <Image key={u} source={{ uri: u }} style={{ width: 64, height: 64, borderRadius: 8 }} />
              ))}
            </View>
            {user?.id === item.authorId ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={styles.secondary} onPress={() => onDelete(item.id)}><Text style={styles.secondaryText}>Delete</Text></TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      />
      <View style={styles.form}>
        <Text style={styles.formHeader}>Add Review</Text>
        <TextInput style={styles.input} placeholder="Stars (1-5)" keyboardType="number-pad" value={stars} onChangeText={setStars} />
        <TextInput style={styles.input} placeholder="Tips (optional)" value={tips} onChangeText={setTips} />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          {photosBase64.map((u, idx) => (<Image key={idx} source={{ uri: u }} style={{ width: 40, height: 40, borderRadius: 6 }} />))}
          <TouchableOpacity style={styles.secondary} onPress={pickPhotos}><Text style={styles.secondaryText}>Add Photos</Text></TouchableOpacity>
        </View>
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
  secondary: { backgroundColor: '#E5E5EA', padding: 10, borderRadius: 10 },
  secondaryText: { color: '#222', fontFamily: 'Poppins_600SemiBold' }
}); 