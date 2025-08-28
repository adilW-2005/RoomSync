import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Image, SafeAreaView } from 'react-native';
import api from '../../api/client';
import * as ImagePicker from 'expo-image-picker';
import useAuthStore from '../../state/useAuthStore';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import FadeSlideIn from '../../components/FadeSlideIn';
import GradientHeader from '../../components/GradientHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, colors, radii } from '../../styles/theme';

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

  const renderItem = ({ item, index }) => (
    <FadeSlideIn delay={index * 40}>
      <View style={styles.cardShadow}>
        <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
          <UTCard style={{ backgroundColor: 'transparent' }}>
            <UTText variant="subtitle">{'★'.repeat(item.stars)}{'☆'.repeat(5 - item.stars)}</UTText>
            {item.tips ? <UTText variant="body" style={{ marginTop: spacing.xs }}>{item.tips}</UTText> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm }}>
              {(item.photos || []).map((u) => (
                <Image key={u} source={{ uri: u }} style={{ width: 64, height: 64, borderRadius: 8 }} />
              ))}
            </View>
            {user?.id === item.authorId ? (
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                <UTButton title="Delete" variant="secondary" onPress={() => onDelete(item.id)} />
              </View>
            ) : null}
          </UTCard>
        </LinearGradient>
      </View>
    </FadeSlideIn>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <GradientHeader title={place.placeName} rightIcon="options-outline" />
      <FlatList
        style={{ flex: 1 }}
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 140 }}
      />
      <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: 20 }}>
        <View style={styles.cardShadow}>
          <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
            <UTCard style={{ backgroundColor: 'transparent' }}>
              <UTText variant="subtitle" style={{ color: colors.burntOrange, marginBottom: spacing.xs }}>Add Review</UTText>
              <TextInput style={styles.input} placeholder="Stars (1-5)" keyboardType="number-pad" value={stars} onChangeText={setStars} />
              <TextInput style={styles.input} placeholder="Tips (optional)" value={tips} onChangeText={setTips} />
              <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginBottom: spacing.md }}>
                {photosBase64.map((u, idx) => (<Image key={idx} source={{ uri: u }} style={{ width: 40, height: 40, borderRadius: 6 }} />))}
                <UTButton title="Add Photos" variant="secondary" onPress={pickPhotos} />
              </View>
              <UTButton title="Submit" onPress={submit} />
            </UTCard>
          </LinearGradient>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 12, marginBottom: 12, backgroundColor: '#FFFFFF' },
  cardShadow: { borderRadius: radii.card, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 7 },
  gradientCard: { borderRadius: radii.card, overflow: 'hidden' },
}); 