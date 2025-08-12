import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import useAuthStore from '../../state/useAuthStore';

export default function LoginScreen({ navigation }) {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async () => {
    try {
      await login({ email, password });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      Alert.alert('Login failed', e.message || 'Try again');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RoomSync UT</Text>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity style={styles.button} onPress={onSubmit}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Create account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, color: '#BF5700', marginBottom: 24, fontFamily: 'Poppins_600SemiBold', textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#BF5700', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6 },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  link: { color: '#BF5700', marginTop: 12, textAlign: 'center' }
}); 