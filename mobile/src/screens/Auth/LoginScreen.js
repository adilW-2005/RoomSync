import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import useAuthStore from '../../state/useAuthStore';
import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTButton from '../../components/UTButton';
import { colors, spacing } from '../../styles/theme';

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
      <UTText variant="title" style={{ color: colors.burntOrange, textAlign: 'center', marginBottom: spacing.lg }}>RoomSync UT</UTText>
      <UTInput label="EMAIL" placeholder="you@utexas.edu" autoCapitalize="none" value={email} onChangeText={setEmail} style={{ marginBottom: spacing.md }} />
      <UTInput label="PASSWORD" placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} style={{ marginBottom: spacing.md }} />
      <UTButton title="Login" onPress={onSubmit} style={{ marginTop: spacing.sm }} />
      <UTButton title="Create account" variant="secondary" onPress={() => navigation.navigate('Register')} style={{ marginTop: spacing.sm }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#F8F8F8' },
}); 