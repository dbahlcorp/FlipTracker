import React from 'react';
import TemplateForm from '../components/TemplateForm';
import { addTemplate } from '../utils/storage';

export default function AddTemplateScreen({ navigation }) {
  const initialForm = {
    name: '',
    materialCost: '',
    consumables: '0',
    labourTime: '0',
    laserTime: '0',
    packaging: '0',
    shipping: '0',
    marketplaceFees: '0',
    sellingPrice: '',
    platform: 'Etsy',
  };

  return (
    <TemplateForm
      initialForm={initialForm}
      submitLabel="Save Template"
      errorMessage="Failed to save template. Please try again."
      onSubmit={async (form) => {
        await addTemplate(form);
        navigation.goBack();
      }}
    />
  );
}
