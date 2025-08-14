import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, TextInput, Alert, Image } from 'react-native';
import useAuthStore from '../../state/useAuthStore';
import useGroupStore from '../../state/useGroupStore';
import api from '../../api/client';
import { startBackgroundUpdates, stopBackgroundUpdates } from '../../lib/locationTask';
import * as ImagePicker from 'expo-image-picker';

export default function SettingsScreen({ navigation }) {
  const { logout, user, updateProfile } = useAuthStore();
  const { currentGroup } = useGroupStore();
  const [sharing, setSharing] = React.useState(false);
  const [visibleToGroup, setVisibleToGroup] = React.useState(true);
  const intervalRef = React.useRef(null);
  const [name, setName] = React.useState(user?.name || '');
  const [bio, setBio] = React.useState(user?.bio || '');
  const [contact, setContact] = React.useState(user?.contact || '');
  const [avatarBase64, setAvatarBase64] = React.useState(null);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const onToggle = async (value) => {
    setSharing(value);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (value && currentGroup?.id) {
      await startBackgroundUpdates();
      intervalRef.current = setInterval(async () => {
        try {
          if (!visibleToGroup) return;
          const lat = 30.285 + Math.random() * 0.001;
          const lng = -97.736 + Math.random() * 0.001;
          await api.post('/locations/beacon', { groupId: currentGroup.id, lat, lng });
        } catch (_) {}
      }, 180000);
    } else {
      await stopBackgroundUpdates();
    }
  };

  const onPick = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.7
      });
      if (!result?.canceled && result?.assets?.[0]?.base64) {
        setAvatarBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (e) {}
  };

  const onSave = async () => {
    try {
      await updateProfile({ name, bio, contact, avatarBase64 });
      Alert.alert('Saved', 'Profile updated');
    } catch (e) {
      Alert.alert('Update failed', e.message || 'Try again');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      {currentGroup ? (
        <View style={styles.groupCard}>
          <Text style={styles.text}>Group: {currentGroup.name}</Text>
          <Text style={styles.code}>Code: {currentGroup.code}</Text>
          <TouchableOpacity style={styles.smallButton} onPress={() => navigation.navigate('GroupSettings')}> 
            <Text style={styles.smallButtonText}>Group Settings</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.profileCard}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <TouchableOpacity onPress={onPick}>
          {avatarBase64 || user?.avatarUrl ? (
            <Image source={{ uri: avatarBase64 || user?.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}><Text style={{ color: '#8E8E93', fontFamily: 'Poppins_600SemiBold' }}>Add Avatar</Text></View>
          )}
        </TouchableOpacity>
        <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Bio" value={bio} onChangeText={setBio} />
        <TextInput style={styles.input} placeholder="Contact (phone/email)" value={contact} onChangeText={setContact} />
        <TouchableOpacity style={styles.button} onPress={onSave}>
          <Text style={styles.buttonText}>Save Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}> 
        <Text style={styles.text}>Share Location</Text>
        <Switch value={sharing} onValueChange={onToggle} />
      </View>
      <View style={styles.row}> 
        <Text style={styles.text}>Visible to Group</Text>
        <Switch value={visibleToGroup} onValueChange={setVisibleToGroup} />
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
  code: { fontFamily: 'Poppins_600SemiBold', color: '#BF5700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginVertical: 12, borderWidth: 1, borderColor: '#F2D388' },
  groupCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginVertical: 12, borderWidth: 1, borderColor: '#F2D388' },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', color: '#333', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#BF5700', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  smallButton: { backgroundColor: '#BF5700', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start' },
  smallButtonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, marginBottom: 12, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' }
}); 