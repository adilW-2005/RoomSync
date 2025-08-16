import React, { useState } from 'react';
import { View, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import useAuthStore from '../../state/useAuthStore';
import * as ImagePicker from 'expo-image-picker';
import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTButton from '../../components/UTButton';
import { colors, spacing, radii } from '../../styles/theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [avatarBase64, setAvatarBase64] = useState(null);

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

  const onSubmit = async () => {
    try {
      await register({ name, email, password, avatarBase64 });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      Alert.alert('Register failed', e.message || 'Try again');
    }
  };

  return (
    <View style={styles.container}>
      <UTText variant="title" style={{ color: colors.burntOrange, textAlign: 'center', marginBottom: spacing.lg }}>Create Account</UTText>
      {avatarBase64 ? (
        <Image source={{ uri: avatarBase64 }} style={styles.avatar} />
      ) : (
        <TouchableOpacity style={styles.avatarPlaceholder} onPress={onPick}>
          <UTText variant="meta" style={{ color: '#8E8E93' }}>Add Avatar</UTText>
        </TouchableOpacity>
      )}
      <UTButton title="Choose Photo" variant="secondary" onPress={onPick} style={{ marginBottom: spacing.md }} />
      <UTInput label="NAME" placeholder="Bevo Longhorn" value={name} onChangeText={setName} style={{ marginBottom: spacing.md }} />
      <UTInput label="EMAIL" placeholder="you@utexas.edu" autoCapitalize="none" value={email} onChangeText={setEmail} style={{ marginBottom: spacing.md }} />
      <UTInput label="PASSWORD" placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} style={{ marginBottom: spacing.md }} />
      <UTButton title="Sign up" onPress={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#F8F8F8' },
  avatar: { width: 92, height: 92, borderRadius: 46, alignSelf: 'center', marginBottom: 12 },
  avatarPlaceholder: { width: 92, height: 92, borderRadius: 46, alignSelf: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
}); 