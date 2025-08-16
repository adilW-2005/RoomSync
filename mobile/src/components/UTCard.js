import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii, spacing, shadows } from '../styles/theme';

export default function UTCard({ style, children, ...rest }) {
  return (
    <View {...rest} style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.md,
    ...shadows.card,
  },
}); 