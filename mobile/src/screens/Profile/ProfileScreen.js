import React from 'react';
import { View, StyleSheet } from 'react-native';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import useAuthStore from '../../state/useAuthStore';
import useGroupStore from '../../state/useGroupStore';
import { spacing, colors } from '../../styles/theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const { currentGroup } = useGroupStore();

  return (
    <View style={styles.container}>
      <UTText variant="title" style={{ color: colors.burntOrange, marginBottom: spacing.md }}>Profile</UTText>

      <UTCard style={{ marginBottom: spacing.md }}>
        <UTText variant="subtitle">{user?.name || 'You'}</UTText>
        {user?.bio ? <UTText variant="meta" style={{ marginTop: spacing.xs }}>{user.bio}</UTText> : null}
        {user?.contact ? <UTText variant="meta" style={{ marginTop: spacing.xs }}>{user.contact}</UTText> : null}
        <UTButton title="Edit Profile" onPress={() => navigation.navigate('SettingsHome')} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
      </UTCard>

      <UTCard style={{ marginBottom: spacing.md }}>
        <UTText variant="subtitle" style={{ marginBottom: spacing.sm }}>Shortcuts</UTText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <UTButton title="My Chores" variant="secondary" onPress={() => navigation.navigate('Chores')} />
          <UTButton title="My Expenses" variant="secondary" onPress={() => navigation.navigate('Expenses')} />
          <UTButton title="My Events" variant="secondary" onPress={() => navigation.navigate('Events')} />
          <UTButton title="My Items" variant="secondary" onPress={() => navigation.navigate('Inventory')} />
          <UTButton title="My Reviews" variant="secondary" onPress={() => navigation.navigate('RatingsList')} />
        </View>
      </UTCard>

      {currentGroup ? (
        <UTCard style={{ marginBottom: spacing.md }}>
          <UTText variant="subtitle">Group</UTText>
          <UTText variant="meta" style={{ marginTop: spacing.xs }}>{currentGroup.name}</UTText>
          <UTButton title="Group Settings" onPress={() => navigation.navigate('GroupSettings')} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
        </UTCard>
      ) : null}

      <UTButton title="Settings" onPress={() => navigation.navigate('SettingsHome')} style={{ marginBottom: spacing.md }} />
      <UTButton title="Logout" variant="secondary" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: '#F8F8F8' },
}); 