import React, { useState } from 'react';
import { View, StyleSheet, Alert, SafeAreaView } from 'react-native';
import useAuthStore from '../../state/useAuthStore';
import UTText from '../../components/UTText';
import UTInput from '../../components/UTInput';
import UTButton from '../../components/UTButton';
import GradientHeader from '../../components/GradientHeader';
import UTCard from '../../components/UTCard';
import { colors, spacing, radii } from '../../styles/theme';

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
     
      <View style={styles.container}>
        <View style={styles.cardShadow}>
          <UTCard style={{ backgroundColor: 'transparent', padding: spacing.lg }}>
            <UTText variant="title" style={{ color: colors.burntOrange, textAlign: 'center', marginBottom: spacing.sm }}>UT Student Living</UTText>
            <UTText variant="meta" style={{ textAlign: 'center', color: '#6B7280', marginBottom: spacing.lg }}>Sign in to continue</UTText>
            <UTInput label="EMAIL" placeholder="you@utexas.edu" autoCapitalize="none" value={email} onChangeText={setEmail} style={{ marginBottom: spacing.md }} />
            <UTInput label="PASSWORD" placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} style={{ marginBottom: spacing.md }} />
            <UTButton title="Login" onPress={onSubmit} style={{ marginTop: spacing.sm }} />
            <UTButton title="Create account" variant="secondary" onPress={() => navigation.navigate('Register')} style={{ marginTop: spacing.sm }} />
          </UTCard>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  cardShadow: { borderRadius: radii.card, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 7 },
}); 