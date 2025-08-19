import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { colors, spacing } from '../styles/theme';

export default function PillTabs({ active = 'Expenses', onChange, tabs = ['Expenses', 'Chores', 'Events', 'Inventory'] }) {
  return (
    <View style={{ marginTop: 6, marginBottom: spacing.md, paddingHorizontal: spacing.lg }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {tabs.map((t) => {
          const selected = active === t;
          return (
            <Pressable
              key={t}
              onPress={() => onChange && onChange(t)}
              style={{
                paddingHorizontal: 14,
                height: 34,
                borderRadius: 999,
                backgroundColor: selected ? colors.burntOrange : '#EFEFF4',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: selected ? colors.white : '#2C2C2E', fontFamily: 'Poppins_600SemiBold', fontSize: 13 }}>{t}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}