import React, { useRef } from 'react';
import { Animated, TouchableWithoutFeedback } from 'react-native';

export default function PressableScale({ onPress, children, style, activeScale = 0.96, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: activeScale, useNativeDriver: true, friction: 7, tension: 120 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }).start(() => {
      if (onPress && !disabled) onPress();
    });
  };

  return (
    <TouchableWithoutFeedback onPressIn={onPressIn} onPressOut={onPressOut} disabled={disabled}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
} 