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
import { updateFlip } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';

const CATEGORIES = ['Phones', 'Laptops', 'Headphones', 'Watches', 'Tablets', 'Other'];
const CONDITIONS = ['Like New', 'Good', 'Fair', 'Parts Only'];
const PLATFORMS = ['Facebook Marketplace', 'eBay', 'Kijiji', 'Other'];
const STATUSES = ['Active', 'Pending', 'Sold'];

function PickerField({ label, options, value, onChange, theme, styles }) {
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

export default function EditFlipScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const existing = route.params.flip;

  const [form, setForm] = useState({
    itemName: existing.itemName ?? '',
    category: existing.category ?? 'Phones',
    buyPrice: existing.buyPrice ?? '',
    sellPrice: existing.sellPrice ?? '',
    fees: existing.fees ?? '0',
    condition: existing.condition ?? 'Good',
    platform: existing.platform ?? 'Facebook Marketplace',
    status: existing.status ?? 'Active',
    dateBought: existing.dateBought ?? '',
    dateSold: existing.dateSold ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.itemName.trim()) {
      Alert.alert('Missing Info', 'Please enter an item name.');
      return;
    }
    setSaving(true);
    try {
      await updateFlip(existing.id, form);
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const previewProfit =
    (parseFloat(form.sellPrice) || 0) -
    (parseFloat(form.buyPrice) || 0) -
    (parseFloat(form.fees) || 0);

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
          placeholder="e.g. iPhone 14 Pro"
          value={form.itemName}
          onChange={set('itemName')}
          theme={theme}
          styles={styles}
        />

        <PickerField
          label="Category"
          options={CATEGORIES}
          value={form.category}
          onChange={set('category')}
          theme={theme}
          styles={styles}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <InputField
              label="Buy Price"
              placeholder="0.00"
              value={form.buyPrice}
              onChange={set('buyPrice')}
              keyboardType="decimal-pad"
              prefix="$"
              theme={theme}
              styles={styles}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <InputField
              label="Sell Price"
              placeholder="0.00"
              value={form.sellPrice}
              onChange={set('sellPrice')}
              keyboardType="decimal-pad"
              prefix="$"
              theme={theme}
              styles={styles}
            />
          </View>
        </View>

        <InputField
          label="Fees"
          placeholder="0.00"
          value={form.fees}
          onChange={set('fees')}
          keyboardType="decimal-pad"
          prefix="$"
          theme={theme}
          styles={styles}
        />

        {(form.buyPrice || form.sellPrice) ? (
          <View style={[
            styles.profitPreview,
            { borderColor: previewProfit >= 0 ? '#dcfce7' : '#fee2e2',
              backgroundColor: previewProfit >= 0
                ? (theme.isDark ? '#14532d' : '#f0fdf4')
                : (theme.isDark ? '#450a0a' : '#fff5f5') }
          ]}>
            <Text style={styles.profitLabel}>Profit Preview</Text>
            <Text style={[styles.profitValue, { color: previewProfit >= 0 ? '#22c55e' : '#ef4444' }]}>
              {previewProfit >= 0 ? '+' : ''}${previewProfit.toFixed(2)}
            </Text>
          </View>
        ) : null}

        <PickerField
          label="Condition"
          options={CONDITIONS}
          value={form.condition}
          onChange={set('condition')}
          theme={theme}
          styles={styles}
        />

        <PickerField
          label="Platform"
          options={PLATFORMS}
          value={form.platform}
          onChange={set('platform')}
          theme={theme}
          styles={styles}
        />

        <PickerField
          label="Status"
          options={STATUSES}
          value={form.status}
          onChange={set('status')}
          theme={theme}
          styles={styles}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <InputField
              label="Date Bought"
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

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    content: { padding: 20, paddingBottom: 40 },
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
    profitPreview: {
      borderRadius: 10,
      padding: 14,
      marginBottom: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
    },
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
  });
