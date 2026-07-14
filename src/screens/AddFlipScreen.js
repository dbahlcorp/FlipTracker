import React from 'react';
import FlipForm from '../components/FlipForm';
import { addFlip } from '../utils/storage';
import { useCurrency } from '../context/CurrencyContext';

export default function AddFlipScreen({ navigation }) {
  const { currency } = useCurrency();

  const initialForm = {
    itemName: '',
    category: 'Phones',
    buyPrice: '',
    sellPrice: '',
    fees: '0',
    quantity: '1',
    condition: 'Good',
    platform: 'Facebook Marketplace',
    status: 'Active',
    dateBought: new Date().toISOString().split('T')[0],
    dateSold: '',
    notes: '',
    photo: '',
    currency,
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
