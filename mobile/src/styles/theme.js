export const colors = {
  burntOrange: '#BF5700',
  lightGold: '#F2D388',
  deepCharcoal: '#1E1E1E',
  mediumGray: '#666666',
  lightGray: '#F8F8F8',
  border: '#E5E5EA',
  white: '#FFFFFF',
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const radii = {
  card: 16,
  input: 16,
  button: 10,
  pill: 999,
};

export const typography = {
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 24, color: colors.deepCharcoal },
  subtitle: { fontFamily: 'Poppins_500Medium', fontSize: 18, color: colors.deepCharcoal },
  body: { fontFamily: 'Poppins_400Regular', fontSize: 16, color: colors.deepCharcoal },
  meta: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: colors.mediumGray },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: colors.burntOrange, letterSpacing: 0.5 },
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  button: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
};

export const utTheme = {
  colors,
  spacing,
  radii,
  typography,
  shadows,
}; 