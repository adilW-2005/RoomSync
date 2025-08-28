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
import AddExpenseModal from '../screens/Expenses/AddExpenseModal';
import CreateChoreModal from '../screens/Chores/CreateChoreModal';
import ActivityInboxScreen from '../screens/Inbox/ActivityInboxScreen';
import LivingScreen from '../screens/Living/LivingScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import AddExpenseScreen from '../screens/Expenses/AddExpenseScreen';
import CreateChoreScreen from '../screens/Chores/CreateChoreScreen';
import MessagesListScreen from '../screens/Inbox/MessagesListScreen';
import ConversationScreen from '../screens/Inbox/ConversationScreen';
import useMessageStore from '../state/useMessageStore';
import useNotificationStore from '../state/useNotificationStore';

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
      <Stack.Screen name="MarketplaceList" component={MarketplaceScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ headerShown: false }} />
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

// New: Dashboard stack to keep legacy flows reachable from Dashboard
function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ animation: 'fade' }}>
      <Stack.Screen name="DashboardHome" component={DashboardScreen} options={{ title: 'Dashboard', headerShown: false }} />
      <Stack.Screen name="Chores" component={ChoresScreen} options={{ title: 'Chores', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="Events" component={EventsScreen} options={{ title: 'Events', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="Expenses" component={ExpensesScreen} options={{ title: 'Expenses', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Inventory', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="Hangouts" component={HangoutsScreen} options={{ title: 'Hangouts', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="ActivityInbox" component={ActivityInboxScreen} options={{ title: 'Inbox', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ presentation: 'modal', title: 'Add Expense', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="CreateChore" component={CreateChoreScreen} options={{ presentation: 'modal', title: 'Create Chore', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
    </Stack.Navigator>
  );
}

// New: Living stack includes map and ratings flows
function LivingStack() {
  return (
    <Stack.Navigator screenOptions={{ animation: 'fade' }}>
      <Stack.Screen name="LivingHome" component={LivingScreen} options={{ title: 'Living', headerShown: false }} />
      <Stack.Screen name="RatingsList" component={RatingsListScreen} options={{ title: 'Ratings', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="RatingsDetail" component={RatingsDetailScreen} options={{ title: 'Details', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="Map" component={MapScreen} options={{ title: 'Map', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="MapGuide" component={require('../screens/Map/MapGuideScreen').default} options={{ title: 'Guide Me', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="UploadSchedule" component={require('../screens/Dashboard/UploadScheduleScreen').default} options={{ title: 'Upload Schedule', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
    </Stack.Navigator>
  );
}

// New: Messages stack
function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ animation: 'fade' }}>
      <Stack.Screen name="MessagesHome" component={MessagesListScreen} options={{ title: 'Messages', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
      <Stack.Screen name="Conversation" component={ConversationScreen} options={{ title: 'Conversation', headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' } }} />
    </Stack.Navigator>
  );
}

// New: Profile stack wraps profile hub and settings
function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ animation: 'fade' }} initialRouteName="ProfileHome">
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ title: 'Profile', headerShown: false }} />
      <Stack.Screen name="SettingsHome" component={SettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} options={{ headerShown: false }} />
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
  const { unreadTotal } = useMessageStore();
  const { unreadCount: notifUnread } = useNotificationStore();
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerTitleStyle: { fontFamily: 'Poppins_600SemiBold' },
      tabBarActiveTintColor: '#BF5700',
      tabBarInactiveTintColor: '#8E8E93',
      tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 8 },
      tabBarIcon: ({ color, focused }) => {
        const map = {
          Dashboard: 'home',
          Marketplace: 'cart',
          Living: 'home-outline',
          Messages: 'chatbubbles',
          Profile: 'person',
        };
        const name = map[route.name] || 'ellipse';
        return <TabIcon name={name} color={color} focused={focused} />;
      },
      tabBarBadge: route.name === 'Messages' && unreadTotal > 0 ? unreadTotal : undefined,
    })}>
      <Tab.Screen name="Dashboard" component={DashboardStack} options={{ headerShown: false }} />
      <Tab.Screen name="Marketplace" component={MarketplaceStack} options={{ headerShown: false }} />
      <Tab.Screen name="Living" component={LivingStack} options={{ headerShown: false }} />
      <Tab.Screen name="Messages" component={MessagesStack} options={{ headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
} 