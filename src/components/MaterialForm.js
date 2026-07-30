import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { CURRENCIES } from '../context/CurrencyContext';
import { BRAND, TABLET_CONTENT_MAX_WIDTH } from '../constants';
import { calcMaterialValue } from '../utils/storage';

const MATERIAL_TYPES = [
  'Acrylic',
  'Plywood',
  'MDF',
  'Hardwood',
  'Cardboard',
  'Leather',
  'Fabric',
  'Metal',
  'Other',
];

const STOCK_UNITS = ['sheet', 'board', 'piece', 'roll'];

function InputField({
  label,
  value,
  onChange,
  placeholder,
  theme,
  styles,
  keyboardType = 'default',
  prefix,
  multiline = false,
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, multiline && styles.multilineWrapper]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, multiline && styles.multilineInput]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          accessibilityLabel={label}
        />
      </View>
    </View>
  );
}

function ChipPicker({ label, options, value, onChange, styles }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.chip, value === option && styles.chipActive]}
            onPress={() => onChange(option)}
          >
            <Text style={[styles.chipText, value === option && styles.chipTextActive]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function MaterialForm({
  initialForm,
  submitLabel,
  onSubmit,
  onDelete,
  errorMessage,
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const formCurrency = form.currency || 'USD';
  const symbol = CURRENCIES[formCurrency] || '$';

  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const inventoryValue = calcMaterialValue(form);

  const handleSave = async () => {
    const name = (form.name || '').trim();
    if (!name) {
      Alert.alert('Missing Info', 'Please enter a material name.');
      return;
    }
    const costPerPiece = form.costPerPiece === '' ? 0 : Number(form.costPerPiece);
    const quantity = form.quantity === '' ? 0 : Number(form.quantity);
    if (!Number.isFinite(costPerPiece) || !Number.isFinite(quantity) ||
        costPerPiece < 0 || quantity < 0) {
      Alert.alert('Invalid Amount', 'Enter a valid non-negative cost and quantity.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({ ...form, name });
    } catch {
      Alert.alert('Error', errorMessage || 'The material could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <InputField
          label="Material Name *"
          value={form.name}
          onChange={set('name')}
          placeholder="e.g. Baltic Birch 3 mm"
          theme={theme}
          styles={styles}
        />

        <ChipPicker
          label="Material Type"
          options={MATERIAL_TYPES}
          value={form.type}
          onChange={set('type')}
          styles={styles}
        />

        <Text style={styles.currencyNote}>Cost recorded in {formCurrency}</Text>

        <View style={styles.twoColumnRow}>
          <View style={styles.leftColumn}>
            <InputField
              label="Cost Per Piece"
              value={form.costPerPiece}
              onChange={set('costPerPiece')}
              placeholder="0.00"
              keyboardType="decimal-pad"
              prefix={symbol}
              theme={theme}
              styles={styles}
            />
          </View>
          <View style={styles.rightColumn}>
            <InputField
              label="Quantity on Hand"
              value={form.quantity}
              onChange={set('quantity')}
              placeholder="0"
              keyboardType="decimal-pad"
              theme={theme}
              styles={styles}
            />
          </View>
        </View>

        <ChipPicker
          label="Count Each As"
          options={STOCK_UNITS}
          value={form.unit}
          onChange={set('unit')}
          styles={styles}
        />

        <Text style={styles.sectionHint}>Dimensions (optional)</Text>
        <View style={styles.threeColumnRow}>
          <View style={styles.dimensionColumn}>
            <InputField
              label="Width"
              value={form.width}
              onChange={set('width')}
              placeholder="12 in"
              theme={theme}
              styles={styles}
            />
          </View>
          <View style={styles.dimensionColumn}>
            <InputField
              label="Height"
              value={form.height}
              onChange={set('height')}
              placeholder="24 in"
              theme={theme}
              styles={styles}
            />
          </View>
          <View style={styles.dimensionColumn}>
            <InputField
              label="Thickness"
              value={form.thickness}
              onChange={set('thickness')}
              placeholder="3 mm"
              theme={theme}
              styles={styles}
            />
          </View>
        </View>

        <InputField
          label="Supplier"
          value={form.supplier}
          onChange={set('supplier')}
          placeholder="Where you buy it"
          theme={theme}
          styles={styles}
        />

        <InputField
          label="Notes"
          value={form.notes}
          onChange={set('notes')}
          placeholder="Colour, finish, SKU, storage location…"
          theme={theme}
          styles={styles}
          multiline
        />

        <View style={styles.valueCard}>
          <Text style={styles.valueLabel}>Inventory Value</Text>
          <Text style={styles.valueAmount}>{symbol}{inventoryValue.toFixed(2)}</Text>
          <Text style={styles.valueHint}>
            {parseFloat(form.quantity) || 0} {form.unit || 'piece'}{(parseFloat(form.quantity) || 0) === 1 ? '' : 's'}
            {' × '}{symbol}{(parseFloat(form.costPerPiece) || 0).toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : submitLabel}</Text>
        </TouchableOpacity>

        {onDelete ? (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => Alert.alert(
              'Delete Material',
              `Delete "${form.name}" from your materials?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: onDelete },
              ]
            )}
          >
            <Text style={styles.deleteButtonText}>Delete Material</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: {
    width: '100%',
    maxWidth: TABLET_CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 44,
  },
  fieldGroup: { marginBottom: 18 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: t.textMuted,
    marginBottom: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputWrapper: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: t.inputBg,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: t.borderStrong,
  },
  multilineWrapper: { minHeight: 96, alignItems: 'flex-start' },
  input: { flex: 1, fontSize: 15, color: t.text, paddingVertical: 12 },
  multilineInput: { minHeight: 92 },
  prefix: { fontSize: 16, color: t.textMuted, marginRight: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: t.card,
    borderWidth: 1.5,
    borderColor: t.borderStrong,
  },
  chipActive: { borderColor: BRAND.primary, backgroundColor: t.brandTint },
  chipText: { fontSize: 13, color: t.textMuted, fontWeight: '600' },
  chipTextActive: { color: t.brandText, fontWeight: '700' },
  twoColumnRow: { flexDirection: 'row' },
  leftColumn: { flex: 1, marginRight: 8 },
  rightColumn: { flex: 1, marginLeft: 8 },
  sectionHint: {
    fontSize: 13,
    color: t.textFaint,
    fontWeight: '600',
    marginBottom: 10,
  },
  currencyNote: { fontSize: 12, color: t.textFaint, marginBottom: 10 },
  threeColumnRow: { flexDirection: 'row', gap: 8 },
  dimensionColumn: { flex: 1 },
  valueCard: {
    alignItems: 'center',
    backgroundColor: t.brandTint,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.brand,
    padding: 16,
    marginBottom: 20,
  },
  valueLabel: { fontSize: 12, fontWeight: '700', color: t.textMuted, textTransform: 'uppercase' },
  valueAmount: { fontSize: 28, fontWeight: '800', color: t.brandText, marginTop: 3 },
  valueHint: { fontSize: 12, color: t.textMuted, marginTop: 3 },
  saveButton: {
    backgroundColor: BRAND.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: { backgroundColor: BRAND.primaryDisabled },
  saveButtonText: { color: BRAND.onPrimary, fontSize: 16, fontWeight: '700' },
  deleteButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
  },
  deleteButtonText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
});
