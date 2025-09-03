import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, Pressable, Alert } from 'react-native';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import { colors, spacing } from '../../styles/theme';
import useAuthStore from '../../state/useAuthStore';
import useGroupStore from '../../state/useGroupStore';
import * as Notifications from 'expo-notifications';
const Localization = { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local' };
import useScheduleStore from '../../state/useScheduleStore';

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const { currentGroup } = useGroupStore();
  const { nextClass, etaMinutes } = useScheduleStore();
  const [devCount, setDevCount] = useState(0);
  const [showDiag, setShowDiag] = useState(false);
  const [scheduled, setScheduled] = useState([]);

  useEffect(() => {
    (async () => {
      try { const ids = await Notifications.getAllScheduledNotificationsAsync(); setScheduled(ids || []); } catch (_) {}
    })();
  }, []);

  const onVersionTap = () => {
    const n = devCount + 1; setDevCount(n);
    if (n >= 7) { setShowDiag(true); Alert.alert('Diagnostics enabled'); }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
      <UTCard>
        <UTText variant="subtitle">Account</UTText>
        <UTText variant="meta" style={{ marginTop: spacing.xs }}>{user?.email}</UTText>
        <UTButton 
          title="Account Settings" 
          onPress={() => navigation.navigate('AccountSettings')} 
          style={{ marginTop: spacing.md }} 
        />
        <UTButton title="Sign Out" variant="secondary" onPress={logout} style={{ marginTop: spacing.sm }} />
      </UTCard>

      <UTCard style={{ marginTop: spacing.md }}>
        <UTText variant="subtitle">Group</UTText>
        <UTText variant="meta" style={{ marginTop: spacing.xs }}>
          {currentGroup?.name || 'No group selected'}
        </UTText>
        <UTButton 
          title="Group Settings" 
          variant="secondary" 
          onPress={() => navigation.navigate('GroupSettings')} 
          style={{ marginTop: spacing.md }} 
        />
      </UTCard>

      <UTCard style={{ marginTop: spacing.md }}>
        <UTText variant="subtitle">App</UTText>
        <Pressable onPress={onVersionTap}>
          <UTText variant="meta" style={{ marginTop: spacing.xs }}>Version 0.1.0</UTText>
        </Pressable>
      </UTCard>

      {showDiag ? (
        <UTCard style={{ marginTop: spacing.md }}>
          <UTText variant="subtitle">Diagnostics</UTText>
          <UTText variant="meta" style={{ marginTop: spacing.xs }}>Timezone: {Localization.timezone || 'unknown'}</UTText>
          <UTText variant="meta" style={{ marginTop: spacing.xs }}>Now: {new Date().toLocaleString()}</UTText>
          <UTText variant="meta" style={{ marginTop: spacing.xs }}>Next class: {nextClass ? `${nextClass.course} ${nextClass.building} ${nextClass.room || ''} ${nextClass.start_time}` : '—'}</UTText>
          <UTText variant="meta" style={{ marginTop: spacing.xs }}>ETA: {etaMinutes != null ? `${etaMinutes} min` : '—'}</UTText>
          <UTText variant="meta" style={{ marginTop: spacing.xs }}>Scheduled notifications: {scheduled.length}</UTText>
        </UTCard>
      ) : null}
    </ScrollView>
  );
} 