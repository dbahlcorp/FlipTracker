import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { CURRENCIES } from '../context/CurrencyContext';
import { useRates } from '../context/RatesContext';
import {
  PLATFORMS,
  STATUSES,
  TABLET_CONTENT_MAX_WIDTH,
} from '../constants';
import { savePickedPhoto } from '../utils/imageStorage';
import {
  calcLabourCost,
  calcLaserCost,
  calcTotalCost,
  calcProfit,
  calcMargin,
  calcBreakEvenQuantity,
} from '../utils/storage';

function PickerField({ label, options, value, onChange, styles }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, value === opt && styles.chipActive]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function InputField({ label, placeholder, value, onChange, keyboardType = 'default', prefix, theme, styles }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, prefix && styles.inputWithPrefix]}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );
}

/**
 * Shared add/edit form. The parent supplies the initial values, the submit
 * button label, and an onSubmit that persists the flip and navigates away.
 */
export default function FlipForm({ initialForm, submitLabel, errorMessage, onSubmit }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { labourRate, laserRate } = useRates();
  const rates = { labourRate, laserRate };

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const formCurrency = form.currency || 'USD';
  const symbol = CURRENCIES[formCurrency] || '$';

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to add photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      set('photo')(savePickedPhoto(result.assets[0].uri));
    }
  };

  const handleSave = async () => {
    if (!form.itemName.trim()) {
      Alert.alert('Missing Info', 'Please enter an item name.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (e) {
      Alert.alert('Error', errorMessage || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const quantity = parseFloat(form.quantity) || 1;
  const labourCost = calcLabourCost(form, rates);
  const laserCost = calcLaserCost(form, rates);
  const totalCost = calcTotalCost(form, rates);
  const previewProfit = calcProfit(form, rates);
  const previewMargin = calcMargin(form, rates);
  const breakEvenQty = calcBreakEvenQuantity(form, rates);

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
          label="Item Name *"
          placeholder="e.g. Oak Coaster Set"
          value={form.itemName}
          onChange={set('itemName')}
          theme={theme}
          styles={styles}
        />

        <Text style={styles.currencyNote}>Prices recorded in {formCurrency}</Text>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <InputField
              label="Material Cost"
              placeholder="0.00"
              value={form.materialCost}
              onChange={set('materialCost')}
              keyboardType="decimal-pad"
              prefix={symbol}
              theme={theme}
              styles={styles}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <InputField
              label="Consumables"
              placeholder="0.00"
              value={form.consumables}
              onChange={set('consumables')}
              keyboardType="decimal-pad"
              prefix={symbol}
              theme={theme}
              styles={styles}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <InputField
              label="Labour Time (min)"
              placeholder="0"
              value={form.labourTime}
              onChange={set('labourTime')}
              keyboardType="number-pad"
              theme={theme}
              styles={styles}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <InputField
              label="Laser Time (min)"
              placeholder="0"
              value={form.laserTime}
              onChange={set('laserTime')}
              keyboardType="number-pad"
              theme={theme}
              styles={styles}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <InputField
              label="Packaging"
              placeholder="0.00"
              value={form.packaging}
              onChange={set('packaging')}
              keyboardType="decimal-pad"
              prefix={symbol}
              theme={theme}
              styles={styles}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <InputField
              label="Shipping"
              placeholder="0.00"
              value={form.shipping}
              onChange={set('shipping')}
              keyboardType="decimal-pad"
              prefix={symbol}
              theme={theme}
              styles={styles}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <InputField
              label="Marketplace Fees"
              placeholder="0.00"
              value={form.marketplaceFees}
              onChange={set('marketplaceFees')}
              keyboardType="decimal-pad"
              prefix={symbol}
              theme={theme}
              styles={styles}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <InputField
              label="Quantity"
              placeholder="1"
              value={form.quantity}
              onChange={set('quantity')}
              keyboardType="number-pad"
              theme={theme}
              styles={styles}
            />
          </View>
        </View>

        <InputField
          label="Selling Price"
          placeholder="0.00"
          value={form.sellingPrice}
          onChange={set('sellingPrice')}
          keyboardType="decimal-pad"
          prefix={symbol}
          theme={theme}
          styles={styles}
        />

        {quantity > 1 ? (
          <Text style={styles.currencyNote}>
            Recorded as {quantity} units — totals below are for all {quantity}
          </Text>
        ) : null}

        {(form.materialCost || form.sellingPrice) ? (
          <View style={[
            styles.summaryCard,
            { borderColor: previewProfit >= 0 ? '#dcfce7' : '#fee2e2',
              backgroundColor: previewProfit >= 0
                ? (theme.isDark ? '#14532d' : '#f0fdf4')
                : (theme.isDark ? '#450a0a' : '#fff5f5') }
          ]}>
            {(labourCost > 0 || laserCost > 0) ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summarySubLabel}>Labour Cost · Laser Cost</Text>
                <Text style={styles.summarySubValue}>
                  {symbol}{labourCost.toFixed(2)} · {symbol}{laserCost.toFixed(2)}
                </Text>
              </View>
            ) : null}
            <View style={styles.summaryRow}>
              <Text style={styles.summarySubLabel}>Total Cost</Text>
              <Text style={styles.summarySubValue}>{symbol}{totalCost.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.profitLabel}>Profit</Text>
              <Text style={[styles.profitValue, { color: previewProfit >= 0 ? '#22c55e' : '#ef4444' }]}>
                {previewProfit >= 0 ? '+' : '-'}{symbol}{Math.abs(previewProfit).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summarySubLabel}>Profit Margin</Text>
              <Text style={[styles.summarySubValue, { color: previewMargin >= 0 ? '#22c55e' : '#ef4444', fontWeight: '700' }]}>
                {previewMargin.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summarySubLabel}>Break-even Quantity</Text>
              <Text style={styles.summarySubValue}>
                {breakEvenQty !== null ? breakEvenQty : '—'}
              </Text>
            </View>
          </View>
        ) : null}

        <PickerField
          label="Platform"
          options={PLATFORMS}
          value={form.platform}
          onChange={set('platform')}
          styles={styles}
        />

        <PickerField
          label="Status"
          options={STATUSES}
          value={form.status}
          onChange={set('status')}
          styles={styles}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <InputField
              label="Date Made"
              placeholder="YYYY-MM-DD"
              value={form.dateBought}
              onChange={set('dateBought')}
              theme={theme}
              styles={styles}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <InputField
              label="Date Sold"
              placeholder="YYYY-MM-DD"
              value={form.dateSold}
              onChange={set('dateSold')}
              theme={theme}
              styles={styles}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Notes</Text>
          <View style={[styles.inputWrapper, styles.notesWrapper]}>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Serial number, listing URL, buyer info..."
              placeholderTextColor={theme.placeholder}
              value={form.notes}
              onChangeText={set('notes')}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Photo</Text>
          {form.photo ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: form.photo }} style={styles.photoPreview} />
              <TouchableOpacity style={styles.photoAction} onPress={pickPhoto}>
                <Text style={styles.photoActionText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.photoAction, styles.photoRemove]}
                onPress={() => set('photo')('')}
              >
                <Text style={[styles.photoActionText, { color: '#ef4444' }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
              <Text style={styles.photoBtnIcon}>📷</Text>
              <Text style={styles.photoBtnText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : submitLabel}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    content: {
      width: '100%',
      maxWidth: TABLET_CONTENT_MAX_WIDTH,
      alignSelf: 'center',
      padding: 20,
      paddingBottom: 40,
    },
    fieldGroup: { marginBottom: 20 },
    currencyNote: { fontSize: 12, color: t.textFaint, marginBottom: 10, marginTop: -8 },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textMuted,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.inputBg,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: t.borderStrong,
      paddingHorizontal: 12,
    },
    notesWrapper: { alignItems: 'flex-start', paddingVertical: 4 },
    prefix: { fontSize: 16, color: t.textMuted, marginRight: 4 },
    input: { flex: 1, fontSize: 15, color: t.text, paddingVertical: 12 },
    inputWithPrefix: { paddingLeft: 0 },
    notesInput: { height: 80, paddingTop: 8 },
    pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: t.borderStrong,
      backgroundColor: t.card,
    },
    chipActive: { borderColor: '#22c55e', backgroundColor: t.isDark ? '#14532d' : '#f0fdf4' },
    chipText: { fontSize: 13, color: t.textMuted, fontWeight: '500' },
    chipTextActive: { color: t.isDark ? '#4ade80' : '#16a34a', fontWeight: '700' },
    row: { flexDirection: 'row', marginBottom: 0 },
    summaryCard: {
      borderRadius: 10,
      padding: 14,
      marginBottom: 20,
      borderWidth: 1,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    summarySubLabel: { fontSize: 13, color: t.textMuted, fontWeight: '500' },
    summarySubValue: { fontSize: 14, color: t.textSub, fontWeight: '600' },
    summaryDivider: { height: 1, backgroundColor: t.border, marginVertical: 6 },
    profitLabel: { fontSize: 14, color: t.textSub, fontWeight: '600' },
    profitValue: { fontSize: 22, fontWeight: '800' },
    photoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.card,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: t.borderStrong,
      paddingVertical: 20,
      gap: 8,
    },
    photoBtnIcon: { fontSize: 22 },
    photoBtnText: { fontSize: 15, color: t.textMuted, fontWeight: '500' },
    photoContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    photoPreview: { width: 80, height: 80, borderRadius: 10 },
    photoAction: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: t.borderStrong,
      backgroundColor: t.card,
    },
    photoRemove: { borderColor: '#fca5a5' },
    photoActionText: { fontSize: 13, fontWeight: '600', color: t.textMuted },
    saveBtn: {
      backgroundColor: '#22c55e',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
      shadowColor: '#22c55e',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    saveBtnDisabled: { backgroundColor: '#86efac' },
    saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  });
