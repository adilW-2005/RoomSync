import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { ensureSocket } from '../../lib/socket';
import useAuthStore from '../../state/useAuthStore';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import { spacing } from '../../styles/theme';

export default function ListingDetailScreen({ route }) {
  const { listing } = route.params;
  const { token, user } = useAuthStore.getState();

  const onContact = () => {
    try {
      const sock = ensureSocket(token);
      sock?.emit('chat:message', { listingId: listing.id, toSellerId: listing.sellerId, fromUserId: user?.id, text: 'Hi! Is this available?' });
      Alert.alert('Message sent', 'A chat message was sent to the seller (demo).');
    } catch (e) {
      Alert.alert('Contact Seller', 'This is a stub. In v2 we will open chat or email.');
    }
  };

  return (
    <View style={styles.container}>
      <UTCard>
        <UTText variant="title" style={{ marginBottom: spacing.xs }}>{listing.title}</UTText>
        <UTText variant="subtitle" style={{ marginBottom: spacing.xs }}>${listing.price}</UTText>
        <UTText variant="meta" style={{ marginBottom: spacing.md }}>{listing.type} · {listing.status}</UTText>
        {listing.description ? <UTText variant="body" style={{ marginBottom: spacing.md }}>{listing.description}</UTText> : null}
        {listing.loc?.lat && listing.loc?.lng ? (
          <MapView style={styles.map} initialRegion={{ latitude: listing.loc.lat, longitude: listing.loc.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }}>
            <Marker coordinate={{ latitude: listing.loc.lat, longitude: listing.loc.lng }} />
          </MapView>
        ) : null}
        <TouchableOpacity style={styles.button} onPress={onContact}>
          <UTText variant="subtitle" style={styles.buttonText}>Contact Seller</UTText>
        </TouchableOpacity>
      </UTCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: '#F8F8F8' },
  map: { height: 160, borderRadius: 12, marginTop: 12 },
  button: { marginTop: spacing.lg, backgroundColor: '#BF5700', padding: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff' }
}); 