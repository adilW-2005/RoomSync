import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import useListingStore from '../../state/useListingStore';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/client';
import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import SkeletonList from '../../components/SkeletonList';
import EmptyState from '../../components/EmptyState';
import FadeSlideIn from '../../components/FadeSlideIn';
import PressableScale from '../../components/PressableScale';
import { spacing, colors } from '../../styles/theme';

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

  const renderItem = ({ item, index }) => (
    <FadeSlideIn delay={index * 40}>
      <UTCard style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {item.photos?.[0] ? (
            <Image source={{ uri: item.photos[0] }} style={{ width: 80, height: 80, borderRadius: 12 }} />
          ) : null}
          <View style={{ flex: 1 }}>
            <UTText variant="subtitle">{item.title}</UTText>
            <UTText variant="meta">${item.price?.toFixed(2) || '—'}</UTText>
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
              <UTButton title="Favorite" onPress={() => onFavorite(item.id, true)} style={{ flex: 1 }} />
              <UTButton title="Unfavorite" variant="secondary" onPress={() => onFavorite(item.id, false)} style={{ flex: 1 }} />
              <UTButton title="View" variant="secondary" onPress={() => navigation.navigate('ListingDetail', { listing: item })} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </UTCard>
    </FadeSlideIn>
  );

  return (
    <View style={styles.container}>
      <UTText variant="title" style={{ color: colors.burntOrange, marginBottom: spacing.sm }}>Marketplace</UTText>
      <View style={styles.filters}> 
        <UTInput placeholder="Type (sublet|furniture)" value={filters.type} onChangeText={(v) => setFilters({ type: v })} style={{ flex: 1 }} />
        <UTInput placeholder="Search" value={filters.q} onChangeText={(v) => setFilters({ q: v })} style={{ flex: 1 }} />
      </View>
      {loading ? (
        <SkeletonList />
      ) : !items?.length ? (
        <EmptyState title="No listings" subtitle="Create the first listing." />
      ) : (
        <FlatList data={items} keyExtractor={(i) => i.id} renderItem={renderItem} refreshing={loading} onRefresh={fetch} />
      )}
      <PressableScale onPress={createListing}>
        <UTButton title="+ Add Listing" onPress={createListing} style={{ marginTop: spacing.md }} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: '#F8F8F8' },
  filters: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
}); 