import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import useAuthStore from '../../state/useAuthStore';
import useGroupStore from '../../state/useGroupStore';
import api from '../../api/client';
import { startBackgroundUpdates, stopBackgroundUpdates } from '../../lib/locationTask';

export default function SettingsScreen() {
  const { logout, user } = useAuthStore();
  const { currentGroup } = useGroupStore();
  const [sharing, setSharing] = React.useState(false);
  const intervalRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const onToggle = async (value) => {
    setSharing(value);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (value && currentGroup?.id) {
      // Start background task
      await startBackgroundUpdates();
      // Foreground fallback
      intervalRef.current = setInterval(async () => {
        try {
          const lat = 30.285 + Math.random() * 0.001;
          const lng = -97.736 + Math.random() * 0.001;
          await api.post('/locations/beacon', { groupId: currentGroup.id, lat, lng });
        } catch (_) {}
      }, 180000);
    } else {
      await stopBackgroundUpdates();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.text}>Signed in as {user?.email}</Text>
      <View style={styles.row}>
        <Text style={styles.text}>Share Location</Text>
        <Switch value={sharing} onValueChange={onToggle} />
      </View>
      <TouchableOpacity style={styles.button} onPress={logout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, color: '#BF5700', fontFamily: 'Poppins_600SemiBold' },
  text: { fontFamily: 'Poppins_400Regular', marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
  button: { backgroundColor: '#BF5700', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' }
}); 