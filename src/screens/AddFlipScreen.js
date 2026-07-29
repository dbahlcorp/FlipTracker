import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import FlipForm from '../components/FlipForm';
import { addFlip, loadTemplates } from '../utils/storage';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';

function buildInitialForm(currency, template) {
  return {
    itemName: template?.name ?? '',
    materialCost: template?.materialCost ?? '',
    consumables: template?.consumables ?? '0',
    labourTime: template?.labourTime ?? '0',
    laserTime: template?.laserTime ?? '0',
    packaging: template?.packaging ?? '0',
    shipping: template?.shipping ?? '0',
    marketplaceFees: template?.marketplaceFees ?? '0',
    sellingPrice: template?.sellingPrice ?? '',
    quantity: '1',
    platform: template?.platform ?? 'Etsy',
    status: 'Active',
    dateBought: new Date().toISOString().split('T')[0],
    dateSold: '',
    notes: '',
    photo: '',
    currency,
  };
}

export default function AddFlipScreen({ navigation }) {
  const { currency } = useCurrency();
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  useFocusEffect(useCallback(() => { loadTemplates().then(setTemplates); }, []));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <TouchableOpacity style={styles.templateBar} onPress={() => setShowPicker(true)}>
        <Text style={styles.templateBarText}>
          {selectedTemplate ? `Using template: ${selectedTemplate.name}` : 'Use a Template'}
        </Text>
        <Text style={styles.templateBarAction}>{selectedTemplate ? 'Change' : 'Choose'}</Text>
      </TouchableOpacity>

      <FlipForm
        key={selectedTemplate?.id || 'blank'}
        initialForm={buildInitialForm(currency, selectedTemplate)}
        submitLabel="Save Job"
        errorMessage="Failed to save job. Please try again."
        onSubmit={async (form) => {
          await addFlip(form);
          navigation.goBack();
        }}
      />

      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose a Template</Text>
            <ScrollView style={styles.modalList}>
              {templates.length === 0 ? (
                <Text style={styles.modalEmpty}>
                  No templates saved yet. Manage them from My Jobs → Templates.
                </Text>
              ) : (
                templates.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.modalRow}
                    onPress={() => {
                      setSelectedTemplate(t);
                      setShowPicker(false);
                    }}
                  >
                    <Text style={styles.modalRowText}>{t.name}</Text>
                  </TouchableOpacity>
                ))
              )}
              {selectedTemplate ? (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => {
                    setSelectedTemplate(null);
                    setShowPicker(false);
                  }}
                >
                  <Text style={[styles.modalRowText, { color: '#ef4444' }]}>Start from blank instead</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowPicker(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    templateBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: t.card,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    templateBarText: { fontSize: 14, fontWeight: '600', color: t.textSub, flex: 1, marginRight: 10 },
    templateBarAction: { fontSize: 14, fontWeight: '700', color: t.brandText },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: t.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '70%',
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: t.text, marginBottom: 14 },
    modalList: { marginBottom: 12 },
    modalEmpty: { fontSize: 13, color: t.textFaint, textAlign: 'center', paddingVertical: 20, lineHeight: 18 },
    modalRow: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    modalRowText: { fontSize: 15, fontWeight: '600', color: t.text },
    modalClose: {
      paddingVertical: 13,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: t.borderStrong,
      alignItems: 'center',
    },
    modalCloseText: { fontSize: 15, fontWeight: '600', color: t.textMuted },
  });
