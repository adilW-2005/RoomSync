import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';
import utPlaces from '../../assets/ut_places.json';
import api from '../../api/client';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import FadeSlideIn from '../../components/FadeSlideIn';
import RatingStars from '../../components/RatingStars';
import GradientHeader from '../../components/GradientHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, colors, radii } from '../../styles/theme';

export default function RatingsListScreen({ navigation, route }) {
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

  useEffect(() => {
    if (route?.params?.place) {
      navigation.replace('RatingsDetail', { place: route.params.place });
    }
  }, [route?.params?.place]);

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
          <View style={styles.cardShadow}>
            <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
              <UTCard style={{ backgroundColor: 'transparent' }}>
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
            </LinearGradient>
          </View>
        </TouchableOpacity>
      </FadeSlideIn>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={styles.container}>
        <GradientHeader title="UT Housing Ratings" rightIcon="options-outline" />
        <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
          <TextInput style={styles.input} placeholder="Kind (apartment|dorm)" value={kind} onChangeText={setKind} />
          <TextInput style={styles.input} placeholder="Search name" value={q} onChangeText={setQ} />
        </View>
        <FlatList data={filtered} keyExtractor={(p) => p.placeId} renderItem={renderItem} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  input: { flex: 1, borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 10, backgroundColor: '#FFFFFF' },
  cardShadow: { borderRadius: radii.card, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 7 },
  gradientCard: { borderRadius: radii.card, overflow: 'hidden' },
}); 