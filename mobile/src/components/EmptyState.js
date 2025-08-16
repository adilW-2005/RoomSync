import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import UTText from './UTText';
import { colors, spacing } from '../styles/theme';

export default function EmptyState({ title = 'Nothing here yet', subtitle = 'Check back soon', icon = '🤘', children }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <UTText variant="title" style={{ color: colors.burntOrange, marginBottom: spacing.xs }}>{icon}</UTText>
      <UTText variant="subtitle" style={{ textAlign: 'center', marginBottom: spacing.xs }}>{title}</UTText>
      <UTText variant="meta" style={{ textAlign: 'center' }}>{subtitle}</UTText>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
}); 