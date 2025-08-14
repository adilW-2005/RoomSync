import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function SkeletonList({ count = 5, height = 64 }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={[styles.item, { height }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 12,
  },
}); 