import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import useListingStore from '../../state/useListingStore';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/client';

export default function MarketplaceScreen({ navigation }) {
  const { items, loading, filters, setFilters, fetch } = useListingStore();
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetch(); }, [filters.type, filters.q, filters.min, filters.max]);

  const onFavorite = async (id, fav) => {
    try {
      await api.post(`/listings/${id}/${fav ? 'favorite' : 'unfavorite'}`);
      Alert.alert('Saved', fav ? 'Added to favorites' : 'Removed from favorites');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed');
    }
  };

  const createListing = async () => {
    try {
      setCreating(true);
      const photosBase64 = [];
      const pick = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, base64: true, mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      if (pick?.assets?.length) {
        for (const a of pick.assets) {
          if (a.base64) photosBase64.push(`data:image/jpeg;base64,${a.base64}`);
        }
      }
      if (!photosBase64.length) return;
      await api.post('/listings', { type: 'furniture', title: 'New Listing', description: '', price: 10, loc: { lat: 30.285, lng: -97.736 }, photos: [], photosBase64 });
      await fetch();
      Alert.alert('Listing created');
    } catch (e) { Alert.alert('Error', e.message || 'Failed'); }
    finally { setCreating(false); }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ListingDetail', { listing: item })}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.sub}>{item.type} · ${item.price}</Text>
      <Text style={styles.text} numberOfLines={2}>{item.description}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <TouchableOpacity style={styles.fav} onPress={() => onFavorite(item.id, true)}><Text style={styles.favText}>Favorite</Text></TouchableOpacity>
        <TouchableOpacity style={styles.fav} onPress={() => onFavorite(item.id, false)}><Text style={styles.favText}>Unfavorite</Text></TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Marketplace</Text>
      <View style={styles.filters}>
        <TextInput style={styles.input} placeholder="Type (sublet|furniture)" value={filters.type} onChangeText={(v) => setFilters({ type: v })} />
        <TextInput style={styles.input} placeholder="Search" value={filters.q} onChangeText={(v) => setFilters({ q: v })} />
        <TextInput style={styles.input} placeholder="Min" keyboardType="number-pad" value={String(filters.min)} onChangeText={(v) => setFilters({ min: v })} />
        <TextInput style={styles.input} placeholder="Max" keyboardType="number-pad" value={String(filters.max)} onChangeText={(v) => setFilters({ max: v })} />
      </View>
      <FlatList data={items} keyExtractor={(i) => i.id} renderItem={renderItem} refreshing={loading} onRefresh={fetch} />
      <TouchableOpacity style={styles.add} onPress={createListing} disabled={creating}>
        <Text style={styles.addText}>+ Add Listing</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 22, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', marginBottom: 8 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  input: { flexGrow: 1, borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 10, minWidth: 120 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F2D388' },
  title: { fontFamily: 'Poppins_600SemiBold', color: '#222' },
  sub: { fontFamily: 'Poppins_400Regular', color: '#666', marginTop: 4 },
  text: { fontFamily: 'Poppins_400Regular', color: '#444', marginTop: 6 },
  fav: { backgroundColor: '#BF5700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  favText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  add: { marginTop: 8, backgroundColor: '#BF5700', padding: 14, borderRadius: 12, alignItems: 'center' },
  addText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' }
}); 