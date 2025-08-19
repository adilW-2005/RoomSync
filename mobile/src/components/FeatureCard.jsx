import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { colors } from '../styles/theme';

export default function FeatureCard({ icon = 'wallet', title, subtitle, right = true, onPress, style, minHeight = 115, chipSize = 40 }) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const chipRadius = Math.round(chipSize / 2);

  return (
    <Animated.View style={[{ backgroundColor: colors.white, padding: 16, borderRadius: 22, flex: 1, minHeight, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 7 }, aStyle, style]}>
      <Pressable
        onPressIn={() => (scale.value = withSpring(0.98))}
        onPressOut={() => (scale.value = withSpring(1))}
        onPress={onPress}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative' }}
      >
        <View style={{ width: chipSize, height: chipSize, borderRadius: chipRadius, backgroundColor: '#FFE4D1', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={Math.max(18, chipSize * 0.5)} color={colors.burntOrange} />
        </View>
        <View style={{ flex: 1, paddingRight: 18 }}>
          <Text numberOfLines={1} style={{ fontSize: 15, color: colors.deepCharcoal, fontFamily: 'Poppins_600SemiBold' }}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={{ color: colors.mediumGray, marginTop: 4, fontFamily: 'Poppins_400Regular', fontSize: 12 }}>{subtitle}</Text> : null}
        </View>
        {right ? <Ionicons name="chevron-forward" size={16} color={colors.mediumGray} style={{ position: 'absolute', right: 0, opacity: 0.5 }} /> : null}
      </Pressable>
    </Animated.View>
  );
} 