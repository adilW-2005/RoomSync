import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import useGroupStore from '../../state/useGroupStore';
import GroupOnboarding from './GroupOnboarding';
import useAuthStore from '../../state/useAuthStore';
import { ensureSocket, joinGroupRoom } from '../../lib/socket';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import { spacing, colors } from '../../styles/theme';

export default function DashboardScreen({ navigation }) {
  const { currentGroup, getCurrent } = useGroupStore();
  const { token } = useAuthStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try { await getCurrent(); } finally { setLoaded(true); }
    })();
  }, []);

  useEffect(() => {
    if (token && currentGroup?.id) {
      ensureSocket(token);
      joinGroupRoom(currentGroup.id);
    }
  }, [token, currentGroup?.id]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <UTText variant="title" style={{ color: colors.burntOrange, marginBottom: spacing.sm }}>Howdy, Longhorn!</UTText>
      {currentGroup ? (
        <UTCard style={{ marginBottom: spacing.lg }}>
          <UTText variant="subtitle" style={{ marginBottom: 4 }}>Group</UTText>
          <UTText variant="body">{currentGroup.name} ({currentGroup.code})</UTText>
        </UTCard>
      ) : (
        <View style={{ marginBottom: spacing.lg }}>
          <UTText variant="body" style={{ marginBottom: spacing.sm }}>Join or create a group to get started.</UTText>
          <GroupOnboarding />
        </View>
      )}

      <View style={styles.row}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('Chores')}>
          <UTCard style={styles.navCard}><UTText variant="subtitle" style={styles.navText}>Chores</UTText></UTCard>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('Events')}>
          <UTCard style={styles.navCard}><UTText variant="subtitle" style={styles.navText}>Events</UTText></UTCard>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('Expenses')}>
          <UTCard style={styles.navCard}><UTText variant="subtitle" style={styles.navText}>Expenses</UTText></UTCard>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => navigation.navigate('Map')}>
          <UTCard style={styles.navCard}><UTText variant="subtitle" style={styles.navText}>UT Map</UTText></UTCard>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, backgroundColor: '#F8F8F8' },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  navCard: { alignItems: 'center', paddingVertical: spacing.xl },
  navText: { color: colors.burntOrange },
}); 