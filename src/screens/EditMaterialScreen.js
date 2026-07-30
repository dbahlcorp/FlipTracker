import React from 'react';
import MaterialForm from '../components/MaterialForm';
import { deleteMaterial, updateMaterial } from '../utils/storage';

export default function EditMaterialScreen({ route, navigation }) {
  const { material } = route.params;

  return (
    <MaterialForm
      initialForm={material}
      submitLabel="Update Material"
      errorMessage="Failed to update material. Please try again."
      onSubmit={async (form) => {
        await updateMaterial(material.id, form);
        navigation.goBack();
      }}
      onDelete={async () => {
        await deleteMaterial(material.id);
        navigation.goBack();
      }}
    />
  );
}
