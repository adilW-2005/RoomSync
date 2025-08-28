import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors, spacing } from '../styles/theme';

export default function RoommateCard({ name, status = 'Available', fact = 'Online recently', style, onMessage }) {
  const initial = (name || '?').slice(0, 1).toUpperCase();
  const statusColor = status === 'Available' ? colors.burntOrange : '#9CA3AF';
  return (
    <View style={[{ minWidth: 240, height: 132, backgroundColor: colors.white, borderRadius: 20, padding: spacing.md, marginRight: spacing.md }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFE4D1', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ color: colors.burntOrange, fontFamily: 'Poppins_600SemiBold', fontSize: 18 }}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 20 }}>{name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: statusColor }} />
            <Text style={{ color: '#6B7280', fontFamily: 'Poppins_400Regular', fontSize: 12 }}>{status}</Text>
          </View>
        </View>
        {onMessage ? (
          <TouchableOpacity onPress={onMessage} style={{ backgroundColor: '#FFF6EC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}>
            <Text style={{ color: colors.burntOrange, fontFamily: 'Poppins_600SemiBold', fontSize: 12 }}>Message</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ color: '#6B7280', fontFamily: 'Poppins_400Regular', fontSize: 12 }}>{fact}</Text>
    </View>
  );
}