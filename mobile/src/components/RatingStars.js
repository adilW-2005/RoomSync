import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function RatingStars({ value = 0, size = 14, color = '#F4B400' }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const total = 5;
  const stars = [];
  for (let i = 0; i < total; i++) {
    if (i < full) stars.push('star');
    else if (i === full && half) stars.push('star-half');
    else stars.push('star-outline');
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {stars.map((name, idx) => (
        <Ionicons key={idx} name={name} size={size} color={color} style={{ marginRight: 2 }} />
      ))}
    </View>
  );
} 