import React from 'react';
import FlipForm from '../components/FlipForm';
import { addFlip } from '../utils/storage';

export default function AddFlipScreen({ navigation }) {
  const initialForm = {
    itemName: '',
    category: 'Phones',
    buyPrice: '',
    sellPrice: '',
    fees: '0',
    condition: 'Good',
    platform: 'Facebook Marketplace',
    status: 'Active',
    dateBought: new Date().toISOString().split('T')[0],
    dateSold: '',
    notes: '',
    photo: '',
  };

  return (
    <FlipForm
      initialForm={initialForm}
      submitLabel="Save Flip"
      errorMessage="Failed to save flip. Please try again."
      onSubmit={async (form) => {
        await addFlip(form);
        navigation.goBack();
      }}
    />
  );
}
