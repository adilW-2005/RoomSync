import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import useExpenseStore from '../../state/useExpenseStore';
import AddExpenseModal from './AddExpenseModal';
import useMemberStore from '../../state/useMemberStore';

export default function ExpensesScreen() {
  const { balances, fetchBalances, createExpense } = useExpenseStore();
  const { membersById, fetchCurrentGroupMembers } = useMemberStore();
  const [modal, setModal] = useState(false);

  useEffect(() => { fetchBalances(); fetchCurrentGroupMembers(); }, []);

  const onCreate = async (payload) => {
    await createExpense(payload);
    await fetchBalances();
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
      <TouchableOpacity style={styles.button} onPress={() => setModal(true)}>
        <Text style={styles.buttonText}>Add Expense</Text>
      </TouchableOpacity>
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
  positive: { color: '#2ecc71' },
  negative: { color: '#e74c3c' },
  button: { backgroundColor: '#BF5700', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontFamily: 'Poppins_600SemiBold' }
}); 