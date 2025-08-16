import React from 'react';
import { View, StyleSheet, TouchableOpacity, Switch, Alert, Image } from 'react-native';
import useAuthStore from '../../state/useAuthStore';
import useGroupStore from '../../state/useGroupStore';
import api from '../../api/client';
import { startBackgroundUpdates, stopBackgroundUpdates } from '../../lib/locationTask';
import * as ImagePicker from 'expo-image-picker';
import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import { spacing, colors } from '../../styles/theme';

export default function SettingsScreen({ navigation }) {
  const { logout, user, updateProfile, deleteAccount } = useAuthStore();
  const { currentGroup } = useGroupStore();
  const [sharing, setSharing] = React.useState(false);
  const [visibleToGroup, setVisibleToGroup] = React.useState(true);
  const intervalRef = React.useRef(null);
  const [name, setName] = React.useState(user?.name || '');
  const [bio, setBio] = React.useState(user?.bio || '');
  const [contact, setContact] = React.useState(user?.contact || '');
  const [avatarBase64, setAvatarBase64] = React.useState(null);

  const [prefs, setPrefs] = React.useState({
    chores: user?.notificationPrefs?.chores !== false,
    events: user?.notificationPrefs?.events !== false,
    hangouts: user?.notificationPrefs?.hangouts !== false,
    messages: user?.notificationPrefs?.messages !== false,
  });

  React.useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
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
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.7 });
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

  const onSavePrefs = async () => {
    try {
      await api.post('/users/me/notification-prefs', prefs);
      Alert.alert('Saved', 'Notification preferences updated');
    } catch (e) {
      Alert.alert('Update failed', e.message || 'Try again');
    }
  };

  const onDelete = async () => {
    Alert.alert('Delete Account', 'This will permanently delete your account. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteAccount(); } catch (e) { Alert.alert('Delete failed', e.message || 'Try again'); } } }
    ]);
  };

  return (
    <View style={styles.container}>
      <UTText variant="title" style={{ color: colors.burntOrange, marginBottom: spacing.sm }}>Settings</UTText>
      {currentGroup ? (
        <UTCard style={{ marginBottom: spacing.md }}>
          <UTText variant="subtitle">Group: {currentGroup.name}</UTText>
          <UTText variant="meta" style={{ marginTop: spacing.xs }}>Code: {currentGroup.code}</UTText>
          <UTButton title="Group Settings" onPress={() => navigation.navigate('GroupSettings')} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
        </UTCard>
      ) : null}

      <UTCard style={{ marginBottom: spacing.md }}>
        <UTText variant="subtitle" style={{ marginBottom: spacing.sm }}>Profile</UTText>
        <TouchableOpacity onPress={onPick}>
          {avatarBase64 || user?.avatarUrl ? (
            <Image source={{ uri: avatarBase64 || user?.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}><UTText variant="meta" style={{ color: '#8E8E93' }}>Add Avatar</UTText></View>
          )}
        </TouchableOpacity>
        <UTInput placeholder="Name" value={name} onChangeText={setName} style={{ marginBottom: spacing.md }} />
        <UTInput placeholder="Bio" value={bio} onChangeText={setBio} style={{ marginBottom: spacing.md }} />
        <UTInput placeholder="Contact (phone/email)" value={contact} onChangeText={setContact} style={{ marginBottom: spacing.md }} />
        <UTButton title="Save Profile" onPress={onSave} />
      </UTCard>

      <UTCard style={{ marginBottom: spacing.md }}>
        <UTText variant="subtitle" style={{ marginBottom: spacing.sm }}>Notifications</UTText>
        <View style={styles.row}><UTText variant="body">Chores</UTText><Switch value={prefs.chores} onValueChange={(v) => setPrefs({ ...prefs, chores: v })} /></View>
        <View style={styles.row}><UTText variant="body">Events</UTText><Switch value={prefs.events} onValueChange={(v) => setPrefs({ ...prefs, events: v })} /></View>
        <View style={styles.row}><UTText variant="body">Hangouts</UTText><Switch value={prefs.hangouts} onValueChange={(v) => setPrefs({ ...prefs, hangouts: v })} /></View>
        <View style={styles.row}><UTText variant="body">Messages</UTText><Switch value={prefs.messages} onValueChange={(v) => setPrefs({ ...prefs, messages: v })} /></View>
        <UTButton title="Save Preferences" onPress={onSavePrefs} style={{ marginTop: spacing.sm }} />
      </UTCard>

      <UTCard style={{ marginBottom: spacing.md }}>
        <View style={styles.row}> 
          <UTText variant="body">Share Location</UTText>
          <Switch value={sharing} onValueChange={onToggle} />
        </View>
        <View style={styles.row}> 
          <UTText variant="body">Visible to Group</UTText>
          <Switch value={visibleToGroup} onValueChange={setVisibleToGroup} />
        </View>
      </UTCard>

      <UTButton title="Logout" onPress={logout} style={{ marginBottom: spacing.md }} />
      <UTButton title="Delete Account" variant="secondary" onPress={onDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: '#F8F8F8' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.xs },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: spacing.sm },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, marginBottom: spacing.sm, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' }
}); 