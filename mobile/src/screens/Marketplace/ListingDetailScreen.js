import React from 'react';
import { View, StyleSheet, TouchableOpacity, ImageBackground, Dimensions, Platform, ScrollView, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import PressableScale from '../../components/PressableScale';
import UTButton from '../../components/UTButton';
import { spacing, colors, radii } from '../../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ensureSocket } from '../../lib/socket';
import useAuthStore from '../../state/useAuthStore';
import useMessageStore from '../../state/useMessageStore';

const { width: SCREEN_W } = Dimensions.get('window');

export default function ListingDetailScreen({ navigation, route }) {
  const { listing } = route.params;
  const insets = useSafeAreaInsets();
  const { token, user } = useAuthStore.getState();
  const { openOrCreateListing } = useMessageStore.getState();

  const onBack = () => navigation.goBack();
  const onFavorite = () => {};
  const onContact = async () => {
    try {
      const convo = await openOrCreateListing(listing.id, listing.sellerId);
      navigation.navigate('Messages', { screen: 'Conversation', params: { conversationId: convo.id } });
    } catch (e) {
      try {
        const sock = ensureSocket(token);
        sock?.emit('chat:message', { listingId: listing.id, toSellerId: listing.sellerId, fromUserId: user?.id, text: 'Hi! Is this available?' });
      } catch (_) {}
      Alert.alert('Error', e.message || 'Could not open chat');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: insets.top }}>
          <View style={styles.heroWrap}>
            <ImageBackground source={{ uri: listing.photos?.[0] }} style={styles.hero} imageStyle={{ borderBottomLeftRadius: 26, borderBottomRightRadius: 26 }}>
              <LinearGradient colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0.1)", "transparent"]} style={StyleSheet.absoluteFill} />
              <View style={styles.heroActions}>
                <PressableScale onPress={onBack} style={styles.roundBtn} accessibilityLabel="Back">
                  <Ionicons name="chevron-back" size={22} color={colors.burntOrange} />
                </PressableScale>
                <PressableScale onPress={onFavorite} style={styles.roundBtn} accessibilityLabel="Favorite">
                  {listing.isFavorited ? (
                    <View style={{ position: 'relative' }}>
                      <Ionicons name="heart" size={20} color={colors.burntOrange} style={{ position: 'absolute', top: 0, left: 0 }} />
                      <Ionicons name="heart-outline" size={20} color={colors.burntOrange} />
                    </View>
                  ) : (
                    <Ionicons name="heart-outline" size={20} color={colors.burntOrange} />
                  )}
                </PressableScale>
              </View>
            </ImageBackground>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radii.card }}>
            <UTCard style={{ backgroundColor: 'transparent' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <UTText variant="title" style={{ marginBottom: 4 }}>{listing.title}</UTText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <UTText variant="subtitle" style={{ color: colors.burntOrange }}>${(listing.price ?? 0).toFixed(2)}</UTText>
                    {listing.type ? (
                      <View style={styles.chip}><UTText variant="label" style={{ color: colors.burntOrange }}>{capitalize(listing.type)}</UTText></View>
                    ) : null}
                  </View>
                  <UTText variant="meta" style={{ marginBottom: 6 }}>{listing.locationName || 'UT Austin'} · {listing.sellerName || 'Seller'}</UTText>
                  <UTText variant="meta" style={{ color: '#8E8E93' }}>{formatPosted(listing.createdAt)}</UTText>
                </View>
              </View>
            </UTCard>
          </LinearGradient>

          {listing.description ? (
            <View style={{ marginTop: spacing.md }}>
              <UTCard>
                <UTText variant="subtitle" style={{ marginBottom: spacing.xs }}>Details</UTText>
                <UTText variant="body">{listing.description}</UTText>
              </UTCard>
            </View>
          ) : null}

          {listing.loc?.lat && listing.loc?.lng ? (
            <View style={{ marginTop: spacing.md }}>
              <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radii.card }}>
                <UTCard style={{ backgroundColor: 'transparent' }}>
                  <UTText variant="subtitle" style={{ marginBottom: spacing.sm }}>Location</UTText>
                  <MapView style={styles.map} initialRegion={{ latitude: listing.loc.lat, longitude: listing.loc.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }}>
                    <Marker coordinate={{ latitude: listing.loc.lat, longitude: listing.loc.lng }} />
                  </MapView>
                </UTCard>
              </LinearGradient>
            </View>
          ) : null}

          <UTButton title="Chat with Seller" onPress={onContact} style={styles.ctaBtn} textStyle={{ fontSize: 16 }} />
        </View>
      </ScrollView>
    </View>
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

const HERO_H = Math.round(SCREEN_W * 0.42);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  heroWrap: { borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden' },
  hero: { width: '100%', height: HERO_H, backgroundColor: '#F1F1F1' },
  heroActions: { position: 'absolute', top: spacing.lg, left: spacing.lg, right: spacing.lg, flexDirection: 'row', justifyContent: 'space-between' },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF6EC', alignItems: 'center', justifyContent: 'center' },
  chip: { marginLeft: 10, height: 24, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#FFF6EC', alignItems: 'center', justifyContent: 'center' },
  map: { height: 130, borderRadius: 12, marginTop: 10 }, 
  ctaBtn: { backgroundColor: colors.burntOrange, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  ctaText: { color: '#fff' }
}); 