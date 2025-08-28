import React from 'react';
import { View, StyleSheet, Image, SafeAreaView, FlatList } from 'react-native';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import useAuthStore from '../../state/useAuthStore';
import useGroupStore from '../../state/useGroupStore';
import GradientHeader from '../../components/GradientHeader';
import FeatureCard from '../../components/FeatureCard.jsx';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, colors, radii } from '../../styles/theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const { currentGroup } = useGroupStore();

  const FEATURES = [
    { icon: 'broom-outline', title: 'My Chores', onPress: () => navigation.navigate('Chores') },
    { icon: 'card-outline', title: 'My Expenses', onPress: () => navigation.navigate('Expenses') },
    { icon: 'calendar-outline', title: 'My Events', onPress: () => navigation.navigate('Events') },
    { icon: 'cube-outline', title: 'My Items', onPress: () => navigation.navigate('Inventory') },
    { icon: 'star-outline', title: 'My Reviews', onPress: () => navigation.navigate('RatingsList') },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={styles.container}>
        <GradientHeader title="Profile" rightIcon="settings-outline" onPressSettings={() => navigation.navigate('SettingsHome')} />

        {/* Avatar + Basic Info */}
        <View style={styles.cardShadow}>
          <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
            <UTCard style={{ backgroundColor: 'transparent' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.avatar}>
                  <UTText variant="subtitle" style={{ color: colors.burntOrange }}>{(user?.name || 'You').slice(0,1).toUpperCase()}</UTText>
                </View>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <UTText variant="subtitle" style={{ fontSize: 20 }}>{user?.name || 'You'}</UTText>
                  {user?.bio ? <UTText variant="meta" style={{ marginTop: 2 }}>{user.bio}</UTText> : null}
                  {user?.contact ? <UTText variant="meta" style={{ marginTop: 2 }}>{user.contact}</UTText> : null}
                </View>
                <UTButton title="Edit" variant="secondary" onPress={() => navigation.navigate('SettingsHome')} />
              </View>
            </UTCard>
          </LinearGradient>
        </View>

        {/* Feature grid */}
        <View style={{ marginTop: spacing.md }}>
          <UTText variant="subtitle" style={{ marginBottom: spacing.xs }}>Shortcuts</UTText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} onPress={f.onPress} style={{ width: '48%' }} minHeight={100} />
            ))}
          </View>
        </View>

        {/* Group card */}
        {currentGroup ? (
          <View style={[styles.cardShadow, { marginTop: spacing.md }]}> 
            <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
              <UTCard style={{ backgroundColor: 'transparent' }}>
                <UTText variant="subtitle">Group</UTText>
                <UTText variant="meta" style={{ marginTop: spacing.xs }}>{currentGroup.name}</UTText>
                <UTButton title="Group Settings" onPress={() => navigation.navigate('GroupSettings')} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
              </UTCard>
            </LinearGradient>
          </View>
        ) : null}

        {/* Danger zone */}
        <View style={{ marginTop: spacing.lg }}>
          <UTButton title="Settings" onPress={() => navigation.navigate('SettingsHome')} style={{ marginBottom: spacing.md }} />
          <UTButton title="Logout" variant="secondary" onPress={logout} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white, paddingHorizontal: spacing.lg },
  cardShadow: { borderRadius: radii.card, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 7 },
  gradientCard: { borderRadius: radii.card, overflow: 'hidden' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFE4D1', alignItems: 'center', justifyContent: 'center' },
}); 