import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function EmptyState({ title = 'Nothing here yet', subtitle, ctaLabel, onPress }) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🧭</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {ctaLabel && onPress ? (
        <TouchableOpacity style={styles.button} onPress={onPress}>
          <Text style={styles.buttonText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 42, marginBottom: 8 },
  title: { fontFamily: 'Poppins_600SemiBold', color: '#222', fontSize: 16 },
  subtitle: { fontFamily: 'Poppins_400Regular', color: '#666', marginTop: 6, textAlign: 'center' },
  button: { marginTop: 12, backgroundColor: '#BF5700', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' }
}); 