import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { ensureSocket } from '../../lib/socket';
import useAuthStore from '../../state/useAuthStore';

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
      <Text style={styles.title}>{listing.title}</Text>
      <Text style={styles.price}>${listing.price}</Text>
      <Text style={styles.meta}>{listing.type} · {listing.status}</Text>
      {listing.description ? <Text style={styles.text}>{listing.description}</Text> : null}
      {listing.loc?.lat && listing.loc?.lng ? (
        <MapView style={styles.map} initialRegion={{ latitude: listing.loc.lat, longitude: listing.loc.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }}>
          <Marker coordinate={{ latitude: listing.loc.lat, longitude: listing.loc.lng }} />
        </MapView>
      ) : null}
      <TouchableOpacity style={styles.button} onPress={onContact}>
        <Text style={styles.buttonText}>Contact Seller</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 22, color: '#222', fontFamily: 'Poppins_600SemiBold' },
  price: { fontSize: 20, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', marginTop: 6 },
  meta: { color: '#666', fontFamily: 'Poppins_400Regular', marginTop: 6 },
  text: { color: '#444', fontFamily: 'Poppins_400Regular', marginTop: 12 },
  map: { height: 160, borderRadius: 12, marginTop: 12 },
  button: { marginTop: 20, backgroundColor: '#BF5700', padding: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' }
}); 