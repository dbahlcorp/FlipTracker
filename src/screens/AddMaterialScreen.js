import React from 'react';
import MaterialForm from '../components/MaterialForm';
import { useCurrency } from '../context/CurrencyContext';
import { addMaterial } from '../utils/storage';

export default function AddMaterialScreen({ navigation }) {
  const { currency } = useCurrency();
  const initialForm = {
    name: '',
    type: 'Plywood',
    costPerPiece: '',
    quantity: '',
    unit: 'sheet',
    width: '',
    height: '',
    thickness: '',
    supplier: '',
    notes: '',
    currency,
  };

  return (
    <MaterialForm
      initialForm={initialForm}
      submitLabel="Save Material"
      errorMessage="Failed to save material. Please try again."
      onSubmit={async (form) => {
        await addMaterial(form);
        navigation.goBack();
      }}
    />
  );
}
