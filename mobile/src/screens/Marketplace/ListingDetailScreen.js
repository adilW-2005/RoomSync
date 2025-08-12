import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

export default function ListingDetailScreen({ route }) {
  const { listing } = route.params;
  const onContact = () => {
    Alert.alert('Contact Seller', 'This is a stub. In v2 we will open chat or email.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{listing.title}</Text>
      <Text style={styles.price}>${listing.price}</Text>
      <Text style={styles.meta}>{listing.type} · {listing.status}</Text>
      {listing.description ? <Text style={styles.text}>{listing.description}</Text> : null}
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
  button: { marginTop: 20, backgroundColor: '#BF5700', padding: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' }
}); 