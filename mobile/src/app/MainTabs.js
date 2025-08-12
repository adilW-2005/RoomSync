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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function RatingsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="RatingsList" component={RatingsListScreen} options={{ title: 'Ratings', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="RatingsDetail" component={RatingsDetailScreen} options={{ title: 'Details', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
    </Stack.Navigator>
  );
}

function MarketplaceStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MarketplaceList" component={MarketplaceScreen} options={{ title: 'Marketplace', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: 'Listing', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
    </Stack.Navigator>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' },
      tabBarActiveTintColor: '#BF5700',
      tabBarInactiveTintColor: '#8E8E93',
      tabBarIcon: ({ color, size }) => {
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
        return <Ionicons name={name} color={color} size={size} />;
      },
    })}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Chores" component={ChoresScreen} />
      <Tab.Screen name="Events" component={EventsScreen} />
      <Tab.Screen name="Expenses" component={ExpensesScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Marketplace" component={MarketplaceStack} options={{ headerShown: false }} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Ratings" component={RatingsStack} options={{ headerShown: false }} />
      <Tab.Screen name="Hangouts" component={HangoutsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
} 