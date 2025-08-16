import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Linking, Alert, Image } from 'react-native';
import useExpenseStore from '../../state/useExpenseStore';
import AddExpenseModal from './AddExpenseModal';
import useMemberStore from '../../state/useMemberStore';
import UTText from '../../components/UTText';
import UTCard from '../../components/UTCard';
import UTButton from '../../components/UTButton';
import SkeletonList from '../../components/SkeletonList';
import EmptyState from '../../components/EmptyState';
import FadeSlideIn from '../../components/FadeSlideIn';
import { spacing, colors } from '../../styles/theme';

export default function ExpensesScreen() {
  const { balances, expenses, fetchBalances, fetchExpenses, createExpense } = useExpenseStore();
  const { membersById, fetchCurrentGroupMembers } = useMemberStore();
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState(1);

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

  const renderExpense = ({ item, index }) => (
    <FadeSlideIn delay={index * 40}>
      <UTCard style={{ marginBottom: spacing.md }}>
        <UTText variant="subtitle" style={{ marginBottom: spacing.xs }}>{membersById[item.payerId] || item.payerId}</UTText>
        <UTText variant="meta">${item.amount.toFixed(2)} {item.notes ? `• ${item.notes}` : ''}</UTText>
        {item.receiptUrl ? (
          <Image source={{ uri: item.receiptUrl }} style={{ width: 80, height: 80, borderRadius: 8, marginTop: spacing.xs }} />
        ) : null}
      </UTCard>
    </FadeSlideIn>
  );

  return (
    <View style={styles.container}>
      <UTText variant="title" style={{ color: colors.burntOrange, marginBottom: spacing.sm }}>Balances</UTText>
      <UTCard style={{ marginBottom: spacing.md }}>
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

      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
        <UTButton title="Add Expense" onPress={() => setModal(true)} style={{ flex: 1 }} />
        <UTButton title="Export CSV" variant="secondary" onPress={onExportCsv} style={{ flex: 1 }} />
      </View>

      <UTText variant="title" style={{ color: colors.burntOrange, marginBottom: spacing.sm }}>History</UTText>
      {expenses?.length ? (
        <FlatList data={expenses} keyExtractor={(i) => i.id} renderItem={renderExpense} onEndReached={loadMore} onEndReachedThreshold={0.5} />
      ) : (
        <EmptyState title="No expenses yet" subtitle="Add your first expense." />
      )}

      <AddExpenseModal visible={modal} onClose={() => setModal(false)} onCreate={onCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: '#F8F8F8' },
}); 