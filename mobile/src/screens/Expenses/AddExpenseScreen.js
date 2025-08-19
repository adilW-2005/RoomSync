import React from 'react';
import AddExpenseModal from './AddExpenseModal';
import useExpenseStore from '../../state/useExpenseStore';

export default function AddExpenseScreen({ navigation }) {
  const { createExpense } = useExpenseStore();
  const onClose = () => navigation.goBack();
  const onCreate = async (payload) => {
    await createExpense(payload);
  };
  return (
    <AddExpenseModal visible onClose={onClose} onCreate={onCreate} />
  );
} 