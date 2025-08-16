import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import UTText from './UTText';
import { colors, radii, spacing, typography } from '../styles/theme';

export default function UTInput({ label, style, inputStyle, ...rest }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={style}>
      {label ? (
        <UTText variant="label" color={colors.burntOrange} style={{ marginBottom: spacing.xs }}>
          {label}
        </UTText>
      ) : null}
      <TextInput
        {...rest}
        placeholderTextColor={colors.mediumGray}
        style={[
          styles.input,
          focused && styles.focused,
          inputStyle,
        ]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 50,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.deepCharcoal,
    backgroundColor: colors.white,
  },
  focused: {
    borderColor: colors.burntOrange,
  },
}); 