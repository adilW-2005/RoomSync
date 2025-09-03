import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Linking, Alert, Image, SafeAreaView } from 'react-native';
import useExpenseStore from '../../state/useExpenseStore';
import AddExpenseModal from './AddExpenseModal';
import useMemberStore from '../../state/useMemberStore';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import SkeletonList from '../../components/SkeletonList';
import EmptyState from '../../components/EmptyState';
import FadeSlideIn from '../../components/FadeSlideIn';
import PressableScale from '../../components/PressableScale';
import GradientHeader from '../../components/GradientHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, colors, radii } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { sdk } from '../../api/sdk';
import useAuthStore from '../../state/useAuthStore';

export default function ExpensesScreen() {
  const { balances, expenses, fetchBalances, fetchExpenses, createExpense } = useExpenseStore();
  const { membersById, fetchCurrentGroupMembers } = useMemberStore();
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState(1);
  const { user } = useAuthStore();

  useEffect(() => { fetchBalances(); fetchCurrentGroupMembers(); fetchExpenses({ page: 1 }); }, []);

  const onCreate = async (payload) => {
    await createExpense(payload);
    await fetchBalances();
    await fetchExpenses({ page: 1 });
  };

  const loadMore = async () => {
    const next = page + 1;
    const res = await fetchExpenses({ page: next });
    if (res.items?.length) setPage(next);
  };

  const onExportCsv = async () => {
    try {
      const base = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
      const url = `${base}/expenses/export.csv`;
      await Linking.openURL(url);
    } catch (e) { Alert.alert('Export failed', 'Could not open CSV'); }
  };

  const sendExpensePing = async (item) => {
    try {
      const owes = (item.shares || []).map((s) => String(s.userId)).filter((uid) => uid && String(uid) !== String(user?.id));
      const title = 'Expense reminder';
      const body = `Reminder: ${item.notes || 'Expense'} · $${(item.amount || 0).toFixed(2)}`;
      for (const toUserId of owes) {
        await sdk.notifications.ping({ toUserId, contextType: 'expense', contextId: item.id, title, body });
      }
      Alert.alert('Ping sent');
    } catch (e) { Alert.alert('Ping failed', e.message || 'Try again'); }
  };

  const renderExpense = ({ item, index }) => (
    <FadeSlideIn delay={index * 40}>
      <View style={styles.cardShadow}>
        <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
          <UTCard style={{ backgroundColor: 'transparent', padding: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.avatar}>
                <UTText variant="subtitle" style={{ color: colors.burntOrange }}>{(String(membersById[item.payerId] || item.payerId).trim()[0] || '?').toUpperCase()}</UTText>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <UTText variant="subtitle" numberOfLines={1} style={{ flex: 1 }}>{membersById[item.payerId] || item.payerId}</UTText>
                  <PressableScale onPress={() => sendExpensePing(item)} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
                    <Ionicons name="notifications-outline" size={18} color={colors.burntOrange} />
                  </PressableScale>
                </View>
                <UTText variant="meta" numberOfLines={1} style={{ marginTop: 2 }}>{item.notes || 'No notes'}</UTText>
              </View>
              <UTText variant="subtitle" style={{ color: colors.burntOrange }}>${item.amount.toFixed(2)}</UTText>
            </View>
            {item.receiptUrl ? (
              <Image source={{ uri: item.receiptUrl }} style={{ width: 84, height: 84, borderRadius: 10, marginTop: spacing.sm }} />
            ) : null}
          </UTCard>
        </LinearGradient>
      </View>
    </FadeSlideIn>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={styles.container}>
        <GradientHeader title="Expenses" rightIcon="cloud-download-outline" onPressSettings={onExportCsv} />

        <View style={{ paddingHorizontal: spacing.lg }}>
          <UTText variant="subtitle" style={{ marginBottom: spacing.xs }}>Balances</UTText>
          <View style={styles.cardShadow}>
            <LinearGradient colors={["#FFF9F2", "#FFFFFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientCard}>
              <UTCard style={{ backgroundColor: 'transparent' }}>
                {balances?.length ? (
                  balances.map((b) => (
                    <View key={b.userId} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs }}>
                      <UTText variant="body">{membersById[b.userId] || b.userId}</UTText>
                      <UTText variant="body" style={{ color: b.amount < 0 ? '#e74c3c' : '#2ecc71' }}>{b.amount.toFixed(2)}</UTText>
                    </View>
                  ))
                ) : (
                  <EmptyState title="All settled" subtitle="No outstanding balances." />
                )}
              </UTCard>
            </LinearGradient>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.md }}>
            <UTButton title="Add Expense" onPress={() => setModal(true)} style={{ flex: 1 }} />
            <UTButton title="Export CSV" variant="secondary" onPress={onExportCsv} style={{ flex: 1 }} />
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm, flex: 1 }}>
          <UTText variant="subtitle" style={{ marginBottom: spacing.xs }}>History</UTText>
          {expenses?.length ? (
            <FlatList
              data={expenses}
              keyExtractor={(i) => i.id}
              renderItem={renderExpense}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
              contentContainerStyle={{ paddingBottom: 120 }}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <EmptyState title="No expenses yet" subtitle="Add your first expense." />
          )}
        </View>

        <AddExpenseModal visible={modal} onClose={() => setModal(false)} onCreate={onCreate} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  cardShadow: { borderRadius: radii.card, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 7 },
  gradientCard: { borderRadius: radii.card, overflow: 'hidden' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFE4D1', alignItems: 'center', justifyContent: 'center' },
}); 