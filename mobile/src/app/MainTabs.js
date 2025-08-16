import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import ChoresScreen from '../screens/Chores/ChoresScreen';
import EventsScreen from '../screens/Events/EventsScreen';
import ExpensesScreen from '../screens/Expenses/ExpensesScreen';
import MapScreen from '../screens/Map/MapScreen';
import MarketplaceScreen from '../screens/Marketplace/MarketplaceScreen';
import ListingDetailScreen from '../screens/Marketplace/ListingDetailScreen';
import InventoryScreen from '../screens/Inventory/InventoryScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import RatingsListScreen from '../screens/Ratings/RatingsListScreen';
import RatingsDetailScreen from '../screens/Ratings/RatingsDetailScreen';
import HangoutsScreen from '../screens/Hangouts/HangoutsScreen';
import { Ionicons } from '@expo/vector-icons';
import GroupSettingsScreen from '../screens/Settings/GroupSettingsScreen';
import { View, Animated } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function RatingsStack() {
  return (
    <Stack.Navigator screenOptions={{ animation: 'fade' }}>
      <Stack.Screen name="RatingsList" component={RatingsListScreen} options={{ title: 'Ratings', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="RatingsDetail" component={RatingsDetailScreen} options={{ title: 'Details', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
    </Stack.Navigator>
  );
}

function MarketplaceStack() {
  return (
    <Stack.Navigator screenOptions={{ animation: 'fade' }}>
      <Stack.Screen name="MarketplaceList" component={MarketplaceScreen} options={{ title: 'Marketplace', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: 'Listing', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ animation: 'fade' }}>
      <Stack.Screen name="SettingsHome" component={SettingsScreen} options={{ title: 'Settings', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} options={{ title: 'Group Settings', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
    </Stack.Navigator>
  );
}

const TabIcon = ({ name, color, focused }) => {
  const scale = React.useRef(new Animated.Value(focused ? 1 : 0.98)).current;
  const fade = React.useRef(new Animated.Value(focused ? 1 : 0.7)).current;
  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: focused ? 1 : 0.98, useNativeDriver: true, friction: 6, tension: 120 }),
      Animated.timing(fade, { toValue: focused ? 1 : 0.7, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [focused]);
  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={{ transform: [{ scale }], opacity: fade }}>
        <Ionicons name={name} color={color} size={24} />
      </Animated.View>
      {focused ? <View style={{ height: 3, width: 18, backgroundColor: '#BF5700', borderRadius: 2, marginTop: 4 }} /> : <View style={{ height: 3, width: 18, marginTop: 4 }} />}
    </View>
  );
};

export default function MainTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' },
      tabBarActiveTintColor: '#BF5700',
      tabBarInactiveTintColor: '#8E8E93',
      tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 8 },
      tabBarIcon: ({ color, focused }) => {
        const map = {
          Dashboard: 'home',
          Chores: 'list',
          Events: 'calendar',
          Expenses: 'cash',
          Map: 'map',
          Marketplace: 'cart',
          Inventory: 'cube',
          Ratings: 'star',
          Hangouts: 'chatbubbles',
          Settings: 'settings',
        };
        const name = map[route.name] || 'ellipse';
        return <TabIcon name={name} color={color} focused={focused} />;
      },
    })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ animation: 'fade' }} />
      <Tab.Screen name="Chores" component={ChoresScreen} options={{ animation: 'fade' }} />
      <Tab.Screen name="Events" component={EventsScreen} options={{ animation: 'fade' }} />
      <Tab.Screen name="Expenses" component={ExpensesScreen} options={{ animation: 'fade' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ animation: 'fade' }} />
      <Tab.Screen name="Marketplace" component={MarketplaceStack} options={{ headerShown: false }} />
      <Tab.Screen name="Inventory" component={InventoryScreen} options={{ animation: 'fade' }} />
      <Tab.Screen name="Ratings" component={RatingsStack} options={{ headerShown: false }} />
      <Tab.Screen name="Hangouts" component={HangoutsScreen} options={{ animation: 'fade' }} />
      <Tab.Screen name="Settings" component={SettingsStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
} 