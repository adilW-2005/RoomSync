import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import utPlaces from '../../assets/ut_places.json';
import api from '../../api/client';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import FadeSlideIn from '../../components/FadeSlideIn';
import RatingStars from '../../components/RatingStars';
import { spacing, colors } from '../../styles/theme';

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

  const renderItem = ({ item, index }) => {
    const avg = avgMap[item.placeId]?.avg;
    const count = avgMap[item.placeId]?.count || 0;
    return (
      <FadeSlideIn delay={index * 40}>
        <TouchableOpacity onPress={() => navigation.navigate('RatingsDetail', { place: item })}>
          <UTCard style={{ marginBottom: spacing.md }}>
            <UTText variant="subtitle" style={{ marginBottom: 4 }}>{item.placeName}</UTText>
            {avg != null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <RatingStars value={avg} />
                <UTText variant="meta" style={{ marginLeft: 6 }}>{avg.toFixed(2)} ({count})</UTText>
              </View>
            ) : (
              <UTText variant="meta">Avg: N/A ({count})</UTText>
            )}
          </UTCard>
        </TouchableOpacity>
      </FadeSlideIn>
    );
  };

  return (
    <View style={styles.container}>
      <UTText variant="title" style={{ color: colors.burntOrange, marginBottom: spacing.sm }}>UT Housing Ratings</UTText>
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
        <TextInput style={styles.input} placeholder="Kind (apartment|dorm)" value={kind} onChangeText={setKind} />
        <TextInput style={styles.input} placeholder="Search name" value={q} onChangeText={setQ} />
      </View>
      <FlatList data={filtered} keyExtractor={(p) => p.placeId} renderItem={renderItem} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: '#F8F8F8' },
  input: { flex: 1, borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 10 },
}); 