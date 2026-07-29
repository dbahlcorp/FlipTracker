import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadTemplates, calcProfit, calcMargin } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useRates } from '../context/RatesContext';
import { BRAND, TABLET_CONTENT_MAX_WIDTH } from '../constants';

export default function TemplatesScreen({ navigation }) {
  const { theme } = useTheme();
  const { symbol } = useCurrency();
  const { labourRate, laserRate } = useRates();
  const rates = { labourRate, laserRate };
  const styles = makeStyles(theme);

  const [templates, setTemplates] = useState([]);

  useFocusEffect(useCallback(() => { loadTemplates().then(setTemplates); }, []));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={styles.content}>
        {templates.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No templates yet.</Text>
            <Text style={styles.emptySub}>
              Save a product's cost recipe once, then reuse it every time you make a new batch.
            </Text>
          </View>
        ) : (
          templates.map((t) => {
            const profit = calcProfit(t, rates);
            const margin = calcMargin(t, rates);
            return (
              <TouchableOpacity
                key={t.id}
                style={styles.card}
                onPress={() => navigation.navigate('EditTemplate', { template: t })}
                activeOpacity={0.85}
              >
                <View style={styles.row}>
                  <Text style={styles.name} numberOfLines={1}>{t.name}</Text>
                  <Text style={[styles.profit, { color: profit >= 0 ? theme.brandText : theme.danger }]}>
                    {profit >= 0 ? '+' : '-'}{symbol}{Math.abs(profit).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{t.platform}</Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.meta}>Sells for {symbol}{(parseFloat(t.sellingPrice) || 0).toFixed(2)}</Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.meta}>{margin.toFixed(0)}% margin</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddTemplate')}>
          <Text style={styles.addBtnText}>+ New Template</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    content: {
      width: '100%',
      maxWidth: TABLET_CONTENT_MAX_WIDTH,
      alignSelf: 'center',
      padding: 16,
      paddingBottom: 40,
    },
    empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
    emptyText: { fontSize: 16, fontWeight: '700', color: t.text, marginBottom: 6 },
    emptySub: { fontSize: 13, color: t.textFaint, textAlign: 'center', lineHeight: 18 },
    card: {
      backgroundColor: t.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: t.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: t.isDark ? 0.3 : 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { flex: 1, marginRight: 10, fontSize: 15, fontWeight: '700', color: t.text },
    profit: { fontSize: 15, fontWeight: '700' },
    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 6 },
    meta: { fontSize: 12, color: t.textMuted },
    dot: { fontSize: 12, color: t.borderStrong, marginHorizontal: 4 },
    addBtn: {
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: 6,
      borderWidth: 1.5,
      borderColor: BRAND.primary,
      backgroundColor: t.brandTint,
    },
    addBtnText: { fontSize: 15, fontWeight: '700', color: t.isDark ? '#4ade80' : '#16a34a' },
  });
