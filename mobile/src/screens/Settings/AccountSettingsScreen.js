import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, Alert, SafeAreaView, ScrollView, Switch, Image } from 'react-native';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import GradientHeader from '../../components/GradientHeader';
import ExpandableImage from '../../components/ImageViewer';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, colors, radii } from '../../styles/theme';
import useAuthStore from '../../state/useAuthStore';
import { sdk } from '../../api/sdk';
import * as ImagePicker from 'expo-image-picker';

export default function AccountSettingsScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  
  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [contact, setContact] = useState(user?.contact || '');
  const [showContact, setShowContact] = useState(user?.showContact || false);
  
  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({
    chores: user?.notificationPrefs?.chores ?? true,
    events: user?.notificationPrefs?.events ?? true,
    hangouts: user?.notificationPrefs?.hangouts ?? true,
    messages: user?.notificationPrefs?.messages ?? true,
  });

  useEffect(() => {
    // Update local state if user data changes
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setContact(user.contact || '');
      setShowContact(user.showContact || false);
      setNotifPrefs({
        chores: user.notificationPrefs?.chores ?? true,
        events: user.notificationPrefs?.events ?? true,
        hangouts: user.notificationPrefs?.hangouts ?? true,
        messages: user.notificationPrefs?.messages ?? true,
      });
    }
  }, [user]);

  const updateProfile = async () => {
    try {
      setLoading(true);
      const updates = {};
      
      if (name.trim() !== user?.name) updates.name = name.trim();
      if (username.trim() !== user?.username) updates.username = username.trim();
      if (bio.trim() !== user?.bio) updates.bio = bio.trim();
      if (contact.trim() !== user?.contact) updates.contact = contact.trim();
      if (showContact !== user?.showContact) updates.showContact = showContact;
      
      if (Object.keys(updates).length > 0) {
        await sdk.users.updateProfile(updates);
        await refreshUser();
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('No Changes', 'No changes to save');
      }
    } catch (e) {
      Alert.alert('Update Failed', e.message || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationPrefs = async () => {
    try {
      setLoading(true);
      await sdk.users.updateNotificationPrefs(notifPrefs);
      await refreshUser();
      Alert.alert('Success', 'Notification preferences updated');
    } catch (e) {
      Alert.alert('Update Failed', e.message || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setLoading(true);
        await sdk.users.updateProfile({ avatarBase64: result.assets[0].base64 });
        await refreshUser();
        Alert.alert('Success', 'Profile picture updated');
      }
    } catch (e) {
      Alert.alert('Upload Failed', e.message || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await sdk.users.deleteAccount();
              Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
              logout();
            } catch (e) {
              Alert.alert('Delete Failed', e.message || 'Try again');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <GradientHeader title="Account Settings" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}>
        
        {/* Profile Picture */}
        <View style={styles.cardShadow}>
          <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
            <UTCard style={{ backgroundColor: 'transparent' }}>
              <UTText variant="subtitle" style={{ marginBottom: spacing.md }}>Profile Picture</UTText>
              <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
                {user?.avatarUrl ? (
                  <ExpandableImage source={{ uri: user.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: '#FFE4D1' }]}>
                    <UTText variant="title" style={{ color: colors.burntOrange }}>
                      {(user?.name || '?').slice(0, 1).toUpperCase()}
                    </UTText>
                  </View>
                )}
              </View>
              <UTButton title="Change Picture" variant="secondary" onPress={pickImage} disabled={loading} />
            </UTCard>
          </LinearGradient>
        </View>

        {/* Basic Info */}
        <View style={[styles.cardShadow, { marginTop: spacing.md }]}>
          <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
            <UTCard style={{ backgroundColor: 'transparent' }}>
              <UTText variant="subtitle" style={{ marginBottom: spacing.md }}>Basic Information</UTText>
              
              <UTText variant="body" style={{ marginBottom: spacing.xs }}>Display Name</UTText>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Your display name"
                maxLength={50}
              />
              
              <UTText variant="body" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>Username</UTText>
              <TextInput
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                placeholder="username (optional)"
                autoCapitalize="none"
                maxLength={20}
              />
              
              <UTText variant="body" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>Bio</UTText>
              <TextInput
                value={bio}
                onChangeText={setBio}
                style={[styles.input, { height: 80 }]}
                placeholder="Tell others about yourself..."
                multiline
                maxLength={500}
              />
              
              <UTText variant="body" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>Contact Info</UTText>
              <TextInput
                value={contact}
                onChangeText={setContact}
                style={styles.input}
                placeholder="Phone, social media, etc."
                maxLength={200}
              />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md }}>
                <Switch
                  value={showContact}
                  onValueChange={setShowContact}
                  trackColor={{ false: '#E5E5EA', true: colors.burntOrange }}
                  thumbColor={colors.white}
                />
                <UTText variant="body" style={{ marginLeft: spacing.sm }}>
                  Show contact info to roommates
                </UTText>
              </View>
              
              <UTButton title="Save Profile" onPress={updateProfile} disabled={loading} style={{ marginTop: spacing.lg }} />
            </UTCard>
          </LinearGradient>
        </View>

        {/* Notifications */}
        <View style={[styles.cardShadow, { marginTop: spacing.md }]}>
          <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
            <UTCard style={{ backgroundColor: 'transparent' }}>
              <UTText variant="subtitle" style={{ marginBottom: spacing.md }}>Notification Preferences</UTText>
              
              {Object.entries(notifPrefs).map(([key, value]) => (
                <View key={key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <UTText variant="body" style={{ flex: 1 }}>
                    {key.charAt(0).toUpperCase() + key.slice(1)} notifications
                  </UTText>
                  <Switch
                    value={value}
                    onValueChange={(newValue) => setNotifPrefs(prev => ({ ...prev, [key]: newValue }))}
                    trackColor={{ false: '#E5E5EA', true: colors.burntOrange }}
                    thumbColor={colors.white}
                  />
                </View>
              ))}
              
              <UTButton title="Save Preferences" variant="secondary" onPress={updateNotificationPrefs} disabled={loading} />
            </UTCard>
          </LinearGradient>
        </View>

        {/* Account Actions */}
        <View style={[styles.cardShadow, { marginTop: spacing.md }]}>
          <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
            <UTCard style={{ backgroundColor: 'transparent' }}>
              <UTText variant="subtitle" style={{ marginBottom: spacing.md }}>Account</UTText>
              
              <UTText variant="meta" style={{ marginBottom: spacing.md, color: colors.slate }}>
                Email: {user?.email}
              </UTText>
              
              <UTButton 
                title="Sign Out" 
                variant="secondary" 
                onPress={logout} 
                style={{ marginBottom: spacing.md }} 
              />
              
              <UTButton 
                title="Delete Account" 
                onPress={deleteAccount}
                disabled={loading}
                style={{ backgroundColor: '#e74c3c' }}
              />
            </UTCard>
          </LinearGradient>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardShadow: {
    borderRadius: radii.card,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },
  gradientCard: {
    borderRadius: radii.card,
    overflow: 'hidden',
  },
}); 