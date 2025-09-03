import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import useListingStore from '../../state/useListingStore';
import * as ImagePicker from 'expo-image-picker';
import { sdk } from '../../api/sdk';
import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import SkeletonList from '../../components/SkeletonList';
import EmptyState from '../../components/EmptyState';
import FadeSlideIn from '../../components/FadeSlideIn';
import PressableScale from '../../components/PressableScale';
import { spacing, colors, radii, shadows } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GradientHeader from '../../components/GradientHeader';
import CreateListingModal from './CreateListingModal';

const MARKET_TABS = ['All', 'Furniture', 'Sublets', 'Textbooks', 'Parking', 'Other'];

export default function MarketplaceScreen({ navigation, route }) {
  const { items, loading, filters, setFilters, fetch } = useListingStore();
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { fetch(); }, [filters.type, filters.q, filters.min, filters.max]);

  useEffect(() => {
    if (route?.params?.type && route.params.type !== filters.type) {
      setFilters({ type: route.params.type });
    }
  }, [route?.params?.type]);

  useEffect(() => {
    if (route?.params?.q != null && route.params.q !== filters.q) {
      setFilters({ q: route.params.q });
    }
  }, [route?.params?.q]);

  useEffect(() => {
    if (activeTab === 'All') {
      setFilters({ type: '' });
    } else {
      setFilters({ type: activeTab.toLowerCase() });
    }
  }, [activeTab]);

  const onFavorite = async (id, fav) => {
    try {
      // optimistic toggle
      useListingStore.getState().optimisticFavorite(id, fav);
      await sdk.listings.favorite(id, fav);
    } catch (_) {
      // revert on failure
      useListingStore.getState().optimisticFavorite(id, !fav);
    }
  };

  const createListing = async (payload) => {
    try {
      setCreating(true);
      await sdk.listings.create({ ...payload });
      await fetch();
    } catch (_) {}
    finally { setCreating(false); }
  };

  const openCreate = () => setModalOpen(true);
  const closeCreate = () => setModalOpen(false);

  const renderBadge = (item) => {
    if (!item.featured) return null;
    return (
      <View style={styles.featuredBadge}>
        <UTText variant="label" style={{ color: colors.white }}>FEATURED</UTText>
      </View>
    );
  };

  const renderItem = ({ item, index }) => (
    <FadeSlideIn delay={index * 40}>
      <PressableScale onPress={() => navigation.navigate('ListingDetail', { listing: item })}>
        <View style={styles.premiumWrap}>
          <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
            {renderBadge(item)}
            <View style={styles.rowCard}>
              {item.photos?.[0] ? (
                <View style={styles.leftImageOuter}>
                  <View style={styles.leftImageInner}>
                    <Image source={{ uri: item.photos[0] }} style={styles.leftImage} resizeMode="cover" />
                  </View>
                </View>
              ) : (
                <View style={styles.leftImageOuter}>
                  <View style={[styles.leftImageInner, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="image-outline" size={24} color="#8E8E93" />
                  </View>
                </View>
              )}
              <View style={styles.cardBody}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <UTText variant="subtitle" numberOfLines={2} style={{ marginBottom: 2 }}>{item.title}</UTText>
                    <UTText variant="meta" numberOfLines={1} style={{ marginBottom: 6 }}>{item.locationName || 'UT Austin'} · {item.sellerName || 'Seller'}</UTText>
                  </View>
                  <TouchableOpacity onPress={() => onFavorite(item.id, !item.isFavorited)} accessibilityRole="button" style={styles.heart}>
                    {item.isFavorited ? (
                      <View style={styles.heartStack}>
                        <Ionicons name="heart" size={22} color={colors.burntOrange} style={styles.heartAbs} />
                        <Ionicons name="heart-outline" size={22} color={colors.burntOrange} />
                      </View>
                    ) : (
                      <Ionicons name="heart-outline" size={22} color={colors.burntOrange} />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <UTText variant="subtitle" numberOfLines={1} style={{ color: colors.burntOrange }}>${(item.price ?? 0).toFixed(2)}</UTText>
                  {item.type ? (
                    <View style={styles.categoryPill}>
                      <UTText variant="label" style={styles.categoryText}>{capitalize(item.type)}</UTText>
                    </View>
                  ) : null}
                </View>
                <UTText variant="meta" style={{ color: '#8E8E93', marginTop: 8 }}>{formatPosted(item.createdAt)}</UTText>
              </View>
            </View>
          </LinearGradient>
        </View>
      </PressableScale>
    </FadeSlideIn>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={styles.container}>
        <GradientHeader title="Marketplace" rightIcon="chatbubbles-outline" onPressSettings={() => navigation.navigate('MessagesHome')} />

        <View style={styles.segmentRow}>
          <FlatList
            data={MARKET_TABS}
            keyExtractor={(t) => t}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            renderItem={({ item: t }) => {
              const selected = activeTab === t;
              return (
                <TouchableOpacity onPress={() => setActiveTab(t)} style={[styles.segmentPill, { backgroundColor: selected ? colors.burntOrange : '#EFEFF4' }]}>
                  <UTText style={{ color: selected ? colors.white : '#2C2C2E', fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>{t}</UTText>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <View style={{ paddingHorizontal: spacing.lg }}>
          <UTInput placeholder="Search listings" value={filters.q} onChangeText={(v) => setFilters({ q: v })} style={{ marginBottom: spacing.md }} />
        </View>

        {loading ? (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <SkeletonList />
          </View>
        ) : !items?.length ? (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <EmptyState title="No listings" subtitle="Try adjusting filters or add a listing." />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            refreshing={loading}
            onRefresh={fetch}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120, paddingTop: spacing.sm }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            showsVerticalScrollIndicator={false}
          />
        )}

        <PressableScale onPress={openCreate} style={styles.fabWrap}>
          <View style={styles.fab}>
            <Ionicons name="add" size={22} color={colors.white} />
          </View>
        </PressableScale>

        <CreateListingModal
          visible={modalOpen}
          onClose={closeCreate}
          onCreate={createListing}
        />
      </View>
    </SafeAreaView>
  );
}

function formatPosted(dateStr) {
  try {
    if (!dateStr) return 'Posted recently';
    const d = new Date(dateStr);
    const diff = Math.max(0, Date.now() - d.getTime());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Posted today';
    if (days === 1) return 'Posted 1 day ago';
    return `Posted ${days} days ago`;
  } catch (_) {
    return 'Posted recently';
  }
}

function capitalize(v) {
  try { if (!v) return ''; return String(v).charAt(0).toUpperCase() + String(v).slice(1); } catch (_) { return v; }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  segmentRow: { height: 48, marginBottom: spacing.sm },
  segmentPill: { height: 34, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4 },
  premiumWrap: { borderRadius: radii.card, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 7 },
  gradientCard: { borderRadius: radii.card, overflow: 'hidden' },
  rowCard: { flexDirection: 'row', alignItems: 'stretch', minHeight: 112 }, 
  leftImageOuter: { width: 112, height: '100%', padding: 3, paddingRight: 3, }, 
  leftImageInner: { flex: 1, borderTopLeftRadius: radii.card, borderBottomLeftRadius: radii.card, overflow: 'hidden', backgroundColor: '#EFEFF4', borderWidth: 1, borderColor: colors.white }, 
  leftImage: { width: '100%', height: '100%' }, 
  cardBody: { flex: 1, padding: spacing.md, justifyContent: 'center', paddingRight: spacing.md + 6 }, 
  heart: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF6EC' },
  heartStack: { position: 'relative' },
  heartAbs: { position: 'absolute', top: 0, left: 0 },
  featuredBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: colors.burntOrange, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, zIndex: 2 },
  categoryPill: { marginLeft: 10, height: 22, paddingHorizontal: 10, borderRadius: 11, backgroundColor: '#FFF6EC', alignItems: 'center', justifyContent: 'center' },
  categoryText: { color: colors.burntOrange },
  fabWrap: { position: 'absolute', right: 20, bottom: 28 },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.burntOrange, alignItems: 'center', justifyContent: 'center', ...shadows.button },
}); 