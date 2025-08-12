import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { ActivityIndicator, View } from 'react-native';
import AuthStack from './src/app/AuthStack';
import MainTabs from './src/app/MainTabs';
import useAuthStore from './src/state/useAuthStore';
import useGroupStore from './src/state/useGroupStore';
import { requestNotificationPermissions } from './src/lib/notifications';

const Stack = createNativeStackNavigator();

const UTTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#BF5700',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#222222',
    border: '#E5E5EA',
    notification: '#BF5700'
  }
};

export default function App() {
  const [loaded] = useFonts({ Poppins_400Regular, Poppins_600SemiBold });
  const { hydrated: authHydrated, user, hydrate: hydrateAuth } = useAuthStore();
  const { hydrated: groupHydrated, hydrate: hydrateGroup } = useGroupStore();

  React.useEffect(() => { hydrateAuth(); hydrateGroup(); requestNotificationPermissions(); }, []);

  if (!loaded || !authHydrated || !groupHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <NavigationContainer theme={UTTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 