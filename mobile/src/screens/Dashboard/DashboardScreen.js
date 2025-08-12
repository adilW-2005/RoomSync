import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import useGroupStore from '../../state/useGroupStore';
import GroupOnboarding from './GroupOnboarding';
import useAuthStore from '../../state/useAuthStore';
import { ensureSocket, joinGroupRoom } from '../../lib/socket';

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
    <View style={styles.container}>
      <Text style={styles.header}>Howdy, Longhorn!</Text>
      {currentGroup ? (
        <Text style={styles.text}>Group: {currentGroup.name} ({currentGroup.code})</Text>
      ) : (
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.text}>Join or create a group to get started.</Text>
          <GroupOnboarding />
        </View>
      )}
      <View style={styles.row}>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Chores')}>
          <Text style={styles.cardTitle}>Chores</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Events')}>
          <Text style={styles.cardTitle}>Events</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Expenses')}>
          <Text style={styles.cardTitle}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Map')}>
          <Text style={styles.cardTitle}>UT Map</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 24, color: '#BF5700', marginBottom: 12, fontFamily: 'Poppins_600SemiBold' },
  text: { color: '#222', fontFamily: 'Poppins_400Regular', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, borderWidth: 1, borderColor: '#F2D388' },
  cardTitle: { fontFamily: 'Poppins_600SemiBold', color: '#BF5700' }
}); 