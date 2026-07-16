import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import { useCurrency, CURRENCIES } from '../context/CurrencyContext';
import { loadGoal, saveGoal, exportAllData, clearAllFlips } from '../utils/storage';
import appJson from '../../app.json';
import { TABLET_CONTENT_MAX_WIDTH } from '../constants';

export default function SettingsScreen() {
  const { theme, toggleTheme } = useTheme();
  const { currency, setCurrency } = useCurrency();
  const styles = makeStyles(theme);

  const [goal, setGoal] = useState(0);
  const [goalInput, setGoalInput] = useState('');
  const [exporting, setExporting] = useState(false);

  useFocusEffect(useCallback(() => {
    loadGoal().then((g) => {
      setGoal(g);
      setGoalInput(g > 0 ? g.toString() : '');
    });
  }, []));

  const handleSaveGoal = async () => {
    const g = parseFloat(goalInput) || 0;
    await saveGoal(g);
    setGoal(g);
    Alert.alert('Saved', 'Monthly goal updated.');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportAllData();
      const file = new File(Paths.cache, `flip-tracker-export-${Date.now()}.json`);
      file.create();
      file.write(JSON.stringify(data, null, 2));

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Flip Tracker Data',
        });
      } else {
        Alert.alert('Sharing unavailable', `Export saved to ${file.uri}`);
      }
    } catch (e) {
      Alert.alert('Export failed', 'Something went wrong while exporting your data.');
    } finally {
      setExporting(false);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This permanently deletes every flip and photo on this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'Last chance — all flip history will be lost.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, delete everything',
                  style: 'destructive',
                  onPress: async () => {
                    await clearAllFlips();
                    await saveGoal(0);
                    setGoal(0);
                    setGoalInput('');
                    Alert.alert('Done', 'All flip data has been cleared.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Dark Mode</Text>
            <Switch
              value={theme.isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#d1d5db', true: '#22c55e' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display Currency</Text>
          <Text style={styles.sectionSub}>
            Each flip keeps the currency it was entered in — amounts are converted to this display
            currency using fixed exchange rates.
          </Text>
          <View style={styles.chipRow}>
            {Object.keys(CURRENCIES).map((code) => (
              <TouchableOpacity
                key={code}
                style={[styles.chip, currency === code && styles.chipActive]}
                onPress={() => setCurrency(code)}
              >
                <Text style={[styles.chipText, currency === code && styles.chipTextActive]}>
                  {code}  {CURRENCIES[code]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Profit Goal</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.prefix}>{CURRENCIES[currency]}</Text>
            <TextInput
              style={styles.input}
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.placeholder}
            />
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoal}>
            <Text style={styles.saveBtnText}>Save Goal</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={handleExport} disabled={exporting}>
            <Text style={styles.actionBtnText}>{exporting ? 'Exporting…' : 'Export Data (JSON)'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.dangerBtn]} onPress={handleClearData}>
            <Text style={[styles.actionBtnText, styles.dangerText]}>Clear All Data</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.aboutText}>{appJson.expo.name}</Text>
          <Text style={styles.aboutSub}>Version {appJson.expo.version}</Text>
        </View>
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
      padding: 16,
      paddingBottom: 40,
    },
    section: {
      backgroundColor: t.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: t.border,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: t.text, marginBottom: 8 },
    sectionSub: { fontSize: 12, color: t.textFaint, marginBottom: 12, lineHeight: 17 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowLabel: { fontSize: 15, color: t.textSub, fontWeight: '600' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: t.borderStrong,
      backgroundColor: t.cardAlt,
    },
    chipActive: { borderColor: '#22c55e', backgroundColor: t.isDark ? '#14532d' : '#f0fdf4' },
    chipText: { fontSize: 13, color: t.textMuted, fontWeight: '600' },
    chipTextActive: { color: t.isDark ? '#4ade80' : '#16a34a', fontWeight: '700' },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.inputBg,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: t.borderStrong,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    prefix: { fontSize: 16, color: t.textMuted, marginRight: 4 },
    input: { flex: 1, fontSize: 16, color: t.text, paddingVertical: 12 },
    saveBtn: {
      backgroundColor: '#22c55e',
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
    },
    saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    actionBtn: {
      borderRadius: 10,
      paddingVertical: 13,
      alignItems: 'center',
      backgroundColor: t.cardAlt,
      borderWidth: 1.5,
      borderColor: t.borderStrong,
      marginBottom: 10,
    },
    actionBtnText: { fontSize: 15, fontWeight: '700', color: t.textSub },
    dangerBtn: { marginBottom: 0, borderColor: '#fca5a5' },
    dangerText: { color: '#ef4444' },
    aboutText: { fontSize: 15, fontWeight: '700', color: t.text },
    aboutSub: { fontSize: 13, color: t.textFaint, marginTop: 2 },
  });
