import React from 'react';
import FlipForm from '../components/FlipForm';
import { updateFlip } from '../utils/storage';

export default function EditFlipScreen({ navigation, route }) {
  const existing = route.params.flip;

  const initialForm = {
    itemName: existing.itemName ?? '',
    materialCost: existing.materialCost ?? '',
    consumables: existing.consumables ?? '0',
    labourTime: existing.labourTime ?? '0',
    laserTime: existing.laserTime ?? '0',
    packaging: existing.packaging ?? '0',
    shipping: existing.shipping ?? '0',
    marketplaceFees: existing.marketplaceFees ?? '0',
    sellingPrice: existing.sellingPrice ?? '',
    quantity: existing.quantity ?? '1',
    platform: existing.platform ?? 'Etsy',
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
