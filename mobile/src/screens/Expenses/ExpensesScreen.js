import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, Alert, Image } from 'react-native';
import useExpenseStore from '../../state/useExpenseStore';
import AddExpenseModal from './AddExpenseModal';
import useMemberStore from '../../state/useMemberStore';

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

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Balances</Text>
      <FlatList
        data={balances}
        keyExtractor={(i) => i.userId}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.user}>{membersById[item.userId] || item.userId}</Text>
            <Text style={[styles.amount, item.amount < 0 ? styles.negative : styles.positive]}>
              {item.amount.toFixed(2)}
            </Text>
          </View>
        )}
      />

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.button} onPress={() => setModal(true)}>
          <Text style={styles.buttonText}>Add Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onExportCsv}>
          <Text style={styles.secondaryButtonText}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.header, { marginTop: 16 }]}>History</Text>
      <FlatList
        data={expenses}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.user}>{membersById[item.payerId] || item.payerId}</Text>
            <Text style={styles.amountRow}>${item.amount.toFixed(2)} {item.notes ? `• ${item.notes}` : ''}</Text>
            {item.receiptUrl ? (
              <Image source={{ uri: item.receiptUrl }} style={styles.receipt} />
            ) : null}
          </View>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
      />

      <AddExpenseModal visible={modal} onClose={() => setModal(false)} onCreate={onCreate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 22, color: '#BF5700', fontFamily: 'Poppins_600SemiBold', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  user: { fontFamily: 'Poppins_400Regular', color: '#222' },
  amount: { fontFamily: 'Poppins_600SemiBold' },
  amountRow: { fontFamily: 'Poppins_600SemiBold', color: '#222', marginTop: 4 },
  positive: { color: '#2ecc71' },
  negative: { color: '#e74c3c' },
  button: { backgroundColor: '#BF5700', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16, flex: 1 },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' },
  secondaryButton: { backgroundColor: '#F2D388', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16, marginLeft: 8 },
  secondaryButtonText: { color: '#333', fontFamily: 'Poppins_600SemiBold' },
  actionsRow: { flexDirection: 'row' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  receipt: { width: 80, height: 80, borderRadius: 8, marginTop: 8 },
}); 