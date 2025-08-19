import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import UTText from './UTText';
import { colors, spacing } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GradientHeader({ title = 'RoomSync', onPressSettings, rightIcon = 'settings', height = 72, overlayHeight = 160 }) {
  const insets = useSafeAreaInsets();
  const containerH = height + insets.top;
  return (
    <View style={{ backgroundColor: colors.white }}>
      <LinearGradient
        colors={["rgba(191,87,0,0.08)", 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: overlayHeight, pointerEvents: 'none' }}
      />
      <View style={[styles.header, { height: containerH, paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.row}>
          <UTText variant="title" color={colors.burntOrange} style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 26 }}>{title}</UTText>
          <Ionicons name={rightIcon} size={22} color="#8E8E93" onPress={onPressSettings} />
        </View>
        <View style={{ width: 36, height: 3, backgroundColor: colors.burntOrange, borderRadius: 2, marginTop: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
}); 