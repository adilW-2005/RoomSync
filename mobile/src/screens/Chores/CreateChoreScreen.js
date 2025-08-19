import React from 'react';
import CreateChoreModal from './CreateChoreModal';
import useChoreStore from '../../state/useChoreStore';

export default function CreateChoreScreen({ navigation }) {
  const { createChore } = useChoreStore();
  const onClose = () => navigation.goBack();
  const onCreate = async (payload) => {
    await createChore(payload);
  };
  return (
    <CreateChoreModal visible onClose={onClose} onCreate={onCreate} />
  );
} 