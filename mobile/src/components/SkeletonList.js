import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '../styles/theme';

export default function SkeletonList({ rows = 5 }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, idx) => (
        <View key={idx} style={[styles.row, { marginBottom: spacing.md }]}>
          <View style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <View style={styles.lineLg} />
            <View style={styles.lineSm} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.lightGray },
  lineLg: { height: 14, borderRadius: radii.pill, backgroundColor: colors.lightGray, marginBottom: spacing.xs },
  lineSm: { height: 10, borderRadius: radii.pill, backgroundColor: colors.lightGray, width: '60%' },
}); 