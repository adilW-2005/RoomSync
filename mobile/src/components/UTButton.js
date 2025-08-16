import React, { useRef } from 'react';
import { TouchableWithoutFeedback, Animated, View, StyleSheet } from 'react-native';
import UTText from './UTText';
import { colors, radii, spacing, shadows } from '../styles/theme';

export default function UTButton({ title, onPress, variant = 'primary', style, textStyle, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 7, tension: 120 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }).start(() => {
      if (onPress && !disabled) onPress();
    });
  };

  const isPrimary = variant === 'primary';

  return (
    <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled}>
      <Animated.View style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        disabled && { opacity: 0.6 },
        { transform: [{ scale }] },
        style,
      ]}>
        <UTText
          variant="subtitle"
          color={isPrimary ? colors.white : colors.burntOrange}
          style={[{ fontSize: 16 }, textStyle]}
        >
          {title}
        </UTText>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    ...shadows.button,
  },
  primary: {
    backgroundColor: colors.burntOrange,
  },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.burntOrange,
  },
}); 