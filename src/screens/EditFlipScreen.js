import React from 'react';
import FlipForm from '../components/FlipForm';
import { updateFlip } from '../utils/storage';

export default function EditFlipScreen({ navigation, route }) {
  const existing = route.params.flip;

  const initialForm = {
    itemName: existing.itemName ?? '',
    category: existing.category ?? 'Phones',
    buyPrice: existing.buyPrice ?? '',
    sellPrice: existing.sellPrice ?? '',
    fees: existing.fees ?? '0',
    quantity: existing.quantity ?? '1',
    condition: existing.condition ?? 'Good',
    platform: existing.platform ?? 'Facebook Marketplace',
    status: existing.status ?? 'Active',
    dateBought: existing.dateBought ?? '',
    dateSold: existing.dateSold ?? '',
    notes: existing.notes ?? '',
    photo: existing.photo ?? '',
    currency: existing.currency || 'USD',
  };

  return (
    <FlipForm
      initialForm={initialForm}
      submitLabel="Save Changes"
      errorMessage="Failed to save changes. Please try again."
      onSubmit={async (form) => {
        await updateFlip(existing.id, form);
        navigation.goBack();
      }}
    />
  );
}
