import React from 'react';
import TemplateForm from '../components/TemplateForm';
import { updateTemplate, deleteTemplate } from '../utils/storage';

export default function EditTemplateScreen({ navigation, route }) {
  const existing = route.params.template;

  const initialForm = {
    name: existing.name ?? '',
    materialCost: existing.materialCost ?? '',
    consumables: existing.consumables ?? '0',
    labourTime: existing.labourTime ?? '0',
    laserTime: existing.laserTime ?? '0',
    packaging: existing.packaging ?? '0',
    shipping: existing.shipping ?? '0',
    marketplaceFees: existing.marketplaceFees ?? '0',
    sellingPrice: existing.sellingPrice ?? '',
    platform: existing.platform ?? 'Etsy',
  };

  return (
    <TemplateForm
      initialForm={initialForm}
      submitLabel="Save Changes"
      errorMessage="Failed to save changes. Please try again."
      onSubmit={async (form) => {
        await updateTemplate(existing.id, form);
        navigation.goBack();
      }}
      onDelete={async () => {
        await deleteTemplate(existing.id);
        navigation.goBack();
      }}
    />
  );
}
