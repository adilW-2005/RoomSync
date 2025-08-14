import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import useAuthStore from '../../state/useAuthStore';
import * as ImagePicker from 'expo-image-picker';

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
      <Text style={styles.title}>Create Account</Text>
      {avatarBase64 ? (
        <Image source={{ uri: avatarBase64 }} style={styles.avatar} />
      ) : (
        <TouchableOpacity style={styles.avatarPlaceholder} onPress={onPick}>
          <Text style={{ color: '#8E8E93', fontFamily: 'Poppins_600SemiBold' }}>Add Avatar</Text>
        </TouchableOpacity>
      )}
      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity style={styles.button} onPress={onSubmit}>
        <Text style={styles.buttonText}>Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, color: '#BF5700', marginBottom: 24, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },
  avatar: { width: 84, height: 84, borderRadius: 42, alignSelf: 'center', marginBottom: 12 },
  avatarPlaceholder: { width: 84, height: 84, borderRadius: 42, alignSelf: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#BF5700', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6 },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
}); 