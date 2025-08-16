import React from 'react';
import { Text } from 'react-native';
import { typography, colors } from '../styles/theme';

export default function UTText({ variant = 'body', color = colors.deepCharcoal, style, children, ...rest }) {
  const baseStyle = typography[variant] || typography.body;
  return (
    <Text {...rest} style={[baseStyle, { color }, style]}>
      {children}
    </Text>
  );
} 