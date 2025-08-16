import React from 'react';
import { View } from 'react-native';
import { colors } from '../styles/theme';

export default function UTPin({ color = colors.burntOrange, accent = colors.lightGold, size = 22, isRoommate = false }) {
  const pinColor = isRoommate ? '#1E90FF' : color;
  const borderColor = isRoommate ? '#BBD9FF' : accent;
  const circleSize = size;
  const tipWidth = Math.max(8, Math.round(size * 0.45));
  const tipHeight = Math.max(6, Math.round(size * 0.4));

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: circleSize,
          height: circleSize,
          borderRadius: circleSize / 2,
          backgroundColor: pinColor,
          borderWidth: 2,
          borderColor,
        }}
      />
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: tipWidth / 2,
          borderRightWidth: tipWidth / 2,
          borderTopWidth: tipHeight,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: pinColor,
          marginTop: -2,
        }}
      />
    </View>
  );
} 