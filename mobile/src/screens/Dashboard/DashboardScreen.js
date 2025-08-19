import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, SafeAreaView, Dimensions, FlatList, Platform, ActionSheetIOS, Alert, Pressable } from 'react-native';
import useGroupStore from '../../state/useGroupStore';
import GroupOnboarding from './GroupOnboarding';
import useAuthStore from '../../state/useAuthStore';
import { ensureSocket, joinGroupRoom } from '../../lib/socket';
import UTText from '../../components/UTText';
import FeatureCard from '../../components/FeatureCard.jsx';
import GradientHeader from '../../components/GradientHeader';
import PillTabs from '../../components/PillTabs';
import RoommateCard from '../../components/RoommateCard';
import useMemberStore from '../../state/useMemberStore';
import { spacing, colors } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';

const HEADER_H = 64;
const ROW_GAP = 12; // smaller gap per spec
const GUTTER = 20;

export default function DashboardScreen({ navigation }) {
  const { currentGroup, getCurrent } = useGroupStore();
  const { token } = useAuthStore();
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('Today');
  const { membersById, fetchCurrentGroupMembers } = useMemberStore();
  const [tabsH, setTabsH] = useState(34);
  const [matesH, setMatesH] = useState(170);

  useEffect(() => {
    (async () => {
      try { await getCurrent(); await fetchCurrentGroupMembers(); } finally { setLoaded(true); }
    })();
  }, []);

  useEffect(() => {
    if (token && currentGroup?.id) {
      ensureSocket(token);
      joinGroupRoom(currentGroup.id);
    }
  }, [token, currentGroup?.id]);

  const win = Dimensions.get('window');
  const winH = win.height;
  const contentW = win.width - GUTTER * 2;

  const heroW = Math.round(win.width * 0.92);
  const cardW = Math.min(heroW, contentW);
  const heroH = 136; // slightly smaller hero height

  const roommateItems = useMemo(() => {
    const you = [{ id: 'you', name: currentGroup?.ownerName || 'You', fact: 'You' }];
    const others = Object.entries(membersById).map(([id, name]) => ({ id, name }));
    return [...you, ...others];
  }, [membersById, currentGroup?.ownerName]);

  const bottomDockSpace = 120;
  const baseMatesHeight = heroH + 34;

  // Target 2 rows of ~120-130 height cards (bigger than before) but still fit
  const gridAvailableH = Math.max(240, winH - (HEADER_H + tabsH + Math.max(matesH, baseMatesHeight) + bottomDockSpace + 16));
  const computedH = Math.floor((gridAvailableH - ROW_GAP) / 2);
  const targetCardH = Math.min(130, Math.max(120, computedH));

  const openInbox = () => navigation.navigate('ActivityInbox');

  const openCreateSheet = () => {
    const options = ['Create Chore', 'Add Expense', 'New Event', 'New Listing', 'Cancel'];
    const cancelButtonIndex = 4;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex }, (i) => handleCreateOption(i));
    } else {
      Alert.alert('Create', 'Pick an action', [
        { text: 'Create Chore', onPress: () => handleCreateOption(0) },
        { text: 'Add Expense', onPress: () => handleCreateOption(1) },
        { text: 'New Event', onPress: () => handleCreateOption(2) },
        { text: 'New Listing', onPress: () => handleCreateOption(3) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleCreateOption = (index) => {
    switch (index) {
      case 0: return navigation.navigate('CreateChore');
      case 1: return navigation.navigate('AddExpense');
      case 2: return navigation.navigate('Events');
      case 3: return navigation.navigate('Marketplace');
      default: return;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" />
      <GradientHeader title="RoomSync" rightIcon="notifications-outline" height={HEADER_H} overlayHeight={160} onPressSettings={openInbox} />
      <View onLayout={(e) => setTabsH(e.nativeEvent.layout.height)}>
        <PillTabs active={activeTab} onChange={setActiveTab} tabs={['Today', 'This Week', 'Overdue', 'Nearby']} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginBottom: 12 }} onLayout={(e) => setMatesH(e.nativeEvent.layout.height)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFE4D1', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="home" size={14} color={colors.burntOrange} />
            </View>
            <UTText variant="subtitle">Roommates</UTText>
          </View>
          <View style={{ height: 2, backgroundColor: 'rgba(191,87,0,0.15)', borderRadius: 2, marginBottom: 10 }} />
          <FlatList
            data={roommateItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ width: win.width, alignItems: 'center' }}>
                <RoommateCard name={item.name} fact={item.fact} style={{ width: cardW, height: heroH }} />
              </View>
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={win.width}
            decelerationRate="fast"
            contentContainerStyle={{ paddingRight: GUTTER }}
          />
        </View>

        {currentGroup ? null : (
          <View style={{ marginBottom: 16 }}>
            <UTText variant="body" style={{ marginBottom: 8 }}>Join or create a group to get started.</UTText>
            <GroupOnboarding />
          </View>
        )}

        <View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: ROW_GAP }}>
            <FeatureCard chipSize={42} minHeight={targetCardH} icon="list" title="Chores" subtitle="Next: None" onPress={() => navigation.navigate('Chores')} style={{ flex: 1 }} />
            <FeatureCard chipSize={42} minHeight={targetCardH} icon="calendar" title="Events" subtitle="This week" onPress={() => navigation.navigate('Events')} style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <FeatureCard chipSize={42} minHeight={targetCardH} icon="cash" title="Expenses" subtitle="Owed to You: $0" onPress={() => navigation.navigate('Expenses')} style={{ flex: 1 }} />
            <FeatureCard chipSize={42} minHeight={targetCardH} icon="chatbubbles" title="Hangouts" subtitle="Plan something" onPress={() => navigation.navigate('Hangouts')} style={{ flex: 1 }} />
          </View>
        </View>
      </ScrollView>

      <Pressable onPress={openCreateSheet} style={styles.fab} accessibilityLabel="Create">
        <Ionicons name="add" size={26} color={colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.burntOrange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
}); 