import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import utPlaces from '../../../packages/shared/ut_places.json';
import api from '../../api/client';

export default function RatingsListScreen({ navigation }) {
  const [avgMap, setAvgMap] = useState({});

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
      <FlatList data={utPlaces} keyExtractor={(p) => p.placeId} renderItem={renderItem} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 22, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, borderWidth: 1, borderColor: '#F2D388' },
  title: { fontFamily: 'Poppins_600SemiBold', color: '#222' },
  sub: { fontFamily: 'Poppins_400Regular', color: '#666', marginTop: 4 },
  chevron: { fontSize: 24, color: '#BF5700', paddingLeft: 8 }
}); 