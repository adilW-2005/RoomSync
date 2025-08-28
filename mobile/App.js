import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_500Medium } from '@expo-google-fonts/poppins';
import { ActivityIndicator, View, Alert, Linking } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AuthStack from './src/app/AuthStack';
import MainTabs from './src/app/MainTabs';
import useAuthStore from './src/state/useAuthStore';
import useGroupStore from './src/state/useGroupStore';
import { requestNotificationPermissions, registerForPushToken } from './src/lib/notifications';
import ErrorBoundary from './src/components/ErrorBoundary';

const Stack = createNativeStackNavigator();

const UTTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#BF5700',
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1E1E1E',
    border: '#E5E5EA',
    notification: '#BF5700'
  }
};

function extractInviteCode(url) {
  try {
    if (!url) return null;
    const codeParam = /[?&]code=([^&]+)/.exec(url);
    if (codeParam && codeParam[1]) return decodeURIComponent(codeParam[1]);
    const pathMatch = /\/invite\/([A-Za-z0-9]+)/.exec(url);
    if (pathMatch && pathMatch[1]) return decodeURIComponent(pathMatch[1]);
  } catch (_) {}
  return null;
}

export default function App() {
  const [loaded] = useFonts({ Poppins_400Regular, Poppins_600SemiBold, Poppins_500Medium });
  const { hydrated: authHydrated, user, hydrate: hydrateAuth, firstRun } = useAuthStore();
  const { hydrated: groupHydrated, hydrate: hydrateGroup, joinByInvite } = useGroupStore();

  React.useEffect(() => { hydrateAuth(); hydrateGroup(); }, []);

  React.useEffect(() => {
    const handler = ({ url }) => {
      try {
        const code = extractInviteCode(url);
        if (code) {
          joinByInvite(code).then(() => Alert.alert('Joined via invite')).catch((e) => Alert.alert('Invite failed', e.message || 'Try again'));
        }
      } catch (_) {}
    };
    const sub = Linking.addEventListener('url', handler);
    // Also handle initial URL
    Linking.getInitialURL().then((initialUrl) => {
      const code = extractInviteCode(initialUrl);
      if (code) joinByInvite(code).catch(() => {});
    }).catch(() => {});
    return () => sub.remove();
  }, []);

  React.useEffect(() => {
    (async () => {
      if (firstRun) {
        try { await requestNotificationPermissions(); } catch (_) {}
      }
    })();
  }, [firstRun]);

  React.useEffect(() => {
    let unbind = () => {};
    if (user) {
      registerForPushToken().catch(() => {});
    }
    return () => { try { unbind(); } catch (_) {} };
  }, [user]);

  if (!loaded || !authHydrated || !groupHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <NavigationContainer theme={UTTheme}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
              <Stack.Screen name="Auth" component={AuthStack} />
            ) : (
              <Stack.Screen name="Main" component={MainTabs} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
} 