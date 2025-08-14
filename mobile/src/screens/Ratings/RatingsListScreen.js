import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import utPlaces from '../../assets/ut_places.json';
import api from '../../api/client';

export default function RatingsListScreen({ navigation }) {
  const [avgMap, setAvgMap] = useState({});
  const [kind, setKind] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const entries = await Promise.all(
        utPlaces.map(async (p) => {
          try {
            const r = await api.get(`/ratings/avg?placeId=${p.placeId}`);
            return [p.placeId, r];
          } catch (_) {
            return [p.placeId, { avg: null, count: 0 }];
          }
        })
      );
      setAvgMap(Object.fromEntries(entries));
    })();
  }, []);

  const filtered = utPlaces.filter((p) => {
    const matchesKind = !kind || (kind === 'apartment' && p.kind === 'apartment') || (kind === 'dorm' && p.kind === 'dorm');
    const matchesQ = !q || p.placeName.toLowerCase().includes(q.toLowerCase());
    return matchesKind && matchesQ;
  });

  const renderItem = ({ item }) => {
    const avg = avgMap[item.placeId]?.avg;
    const count = avgMap[item.placeId]?.count || 0;
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('RatingsDetail', { place: item })}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.placeName}</Text>
          <Text style={styles.sub}>Avg: {avg != null ? avg.toFixed(2) : 'N/A'} ({count})</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>UT Housing Ratings</Text>
      <View style={styles.filters}>
        <TextInput style={styles.input} placeholder="Kind (apartment|dorm)" value={kind} onChangeText={setKind} />
        <TextInput style={styles.input} placeholder="Search name" value={q} onChangeText={setQ} />
      </View>
      <FlatList data={filtered} keyExtractor={(p) => p.placeId} renderItem={renderItem} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 22, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', marginBottom: 8 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, borderWidth: 1, borderColor: '#F2D388' },
  title: { fontFamily: 'Poppins_600SemiBold', color: '#222' },
  sub: { fontFamily: 'Poppins_400Regular', color: '#666', marginTop: 4 },
  chevron: { fontSize: 24, color: '#BF5700', paddingLeft: 8 }
}); 