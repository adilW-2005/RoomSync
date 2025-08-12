import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import useListingStore from '../../state/useListingStore';

export default function MarketplaceScreen({ navigation }) {
  const { items, loading, filters, setFilters, fetch } = useListingStore();

  useEffect(() => { fetch(); }, [filters.type, filters.q, filters.min, filters.max]);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ListingDetail', { listing: item })}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.sub}>{item.type} · ${item.price}</Text>
      <Text style={styles.text} numberOfLines={2}>{item.description}</Text>
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
}); 