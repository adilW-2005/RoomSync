import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{
      headerTitleStyle: { fontFamily: 'Poppins_600SemiBold', fontSize: 22 },
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      animation: 'fade',
    }}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Welcome' }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
    </Stack.Navigator>
  );
} 