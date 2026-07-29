import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useRates } from '../context/RatesContext';
import { PLATFORMS, TABLET_CONTENT_MAX_WIDTH } from '../constants';
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
 * Shared add/edit form for a saved product template — the reusable cost recipe
 * (material, consumables, labour/laser time, packaging, shipping, fees, price) for
 * a product made repeatedly, without the per-batch specifics a flip carries.
 */
export default function TemplateForm({ initialForm, submitLabel, errorMessage, onSubmit, onDelete }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const { symbol } = useCurrency();
  const { labourRate, laserRate } = useRates();
  const rates = { labourRate, laserRate };

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Missing Info', 'Please enter a template name.');
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
          label="Template Name *"
          placeholder="e.g. Oak Coaster Set"
          value={form.name}
          onChange={set('name')}
          theme={theme}
          styles={styles}
        />

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
              <Text style={styles.summarySubLabel}>Total Cost (per unit)</Text>
              <Text style={styles.summarySubValue}>{symbol}{totalCost.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.profitLabel}>Profit (per unit)</Text>
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
          label="Usual Platform"
          options={PLATFORMS}
          value={form.platform}
          onChange={set('platform')}
          styles={styles}
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : submitLabel}</Text>
        </TouchableOpacity>

        {onDelete ? (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => {
              Alert.alert(
                'Delete Template',
                `Delete "${form.name}"? This can't be undone.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: onDelete },
                ]
              );
            }}
          >
            <Text style={styles.deleteBtnText}>Delete Template</Text>
          </TouchableOpacity>
        ) : null}
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
    prefix: { fontSize: 16, color: t.textMuted, marginRight: 4 },
    input: { flex: 1, fontSize: 15, color: t.text, paddingVertical: 12 },
    inputWithPrefix: { paddingLeft: 0 },
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
    deleteBtn: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 12,
      borderWidth: 1.5,
      borderColor: '#fca5a5',
    },
    deleteBtnText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
  });
