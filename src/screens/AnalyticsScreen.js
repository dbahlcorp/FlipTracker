import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadFlips, calcProfit, calcTotalCost, calcDaysToSell, isRealized, getQuantity } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { useRates } from '../context/RatesContext';
import { PLATFORMS, TABLET_CONTENT_MAX_WIDTH } from '../constants';

function BarRow({ label, count, amount, maxAbs, symbol, styles, positiveTextColor, positiveFillColor }) {
  return (
    <View style={styles.catRow}>
      <View style={styles.catLeft}>
        <View style={styles.catLabelRow}>
          <Text style={styles.catName}>{label}</Text>
          <Text style={styles.catCount}>
            {count} job{count !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.barBg}>
          <View
            style={[
              styles.barFill,
              {
                width: `${(Math.abs(amount) / maxAbs) * 100}%`,
                backgroundColor: amount >= 0 ? positiveFillColor : '#dc2626',
              },
            ]}
          />
        </View>
      </View>
      <Text style={[styles.catProfit, { color: amount >= 0 ? positiveTextColor : '#dc2626' }]}>
        {amount >= 0 ? '+' : '-'}{symbol}{Math.abs(amount).toFixed(2)}
      </Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const { symbol, convert } = useCurrency();
  const { labourRate, laserRate } = useRates();
  const rates = { labourRate, laserRate };
  const styles = makeStyles(theme);

  const [flips, setFlips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadFlips().then(setFlips); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFlips().then(setFlips);
    setRefreshing(false);
  };

  const profitOf = (f) => convert(calcProfit(f, rates), f.currency);
  const soldFlips = flips.filter(isRealized);
  const openFlips = flips.filter((f) => !isRealized(f));

  const bestFlip = soldFlips.reduce(
    (best, f) => {
      const p = profitOf(f);
      return p > best.profit ? { ...f, profit: p } : best;
    },
    { profit: -Infinity, itemName: null }
  );

  const realizedCost = soldFlips.reduce((sum, f) => sum + convert(calcTotalCost(f, rates), f.currency), 0);
  const openJobCost = openFlips.reduce((sum, f) => sum + convert(calcTotalCost(f, rates), f.currency), 0);
  const totalRevenue = soldFlips.reduce((sum, f) => sum + convert((parseFloat(f.sellingPrice) || 0) * getQuantity(f), f.currency), 0);
  const totalProfit = soldFlips.reduce((sum, f) => sum + profitOf(f), 0);
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  // Days-to-sell / sell-through
  const daysToSellValues = soldFlips.map(calcDaysToSell).filter((d) => d !== null);
  const avgDaysToSell = daysToSellValues.length > 0
    ? daysToSellValues.reduce((s, d) => s + d, 0) / daysToSellValues.length
    : null;
  const totalUnits = flips.reduce((sum, f) => sum + getQuantity(f), 0);
  const soldUnits = soldFlips.reduce((sum, f) => sum + getQuantity(f), 0);
  const sellThroughRate = totalUnits > 0 ? (soldUnits / totalUnits) * 100 : 0;

  const platformData = PLATFORMS.map((p) => {
    const pFlips = soldFlips.filter((f) => f.platform === p);
    return {
      label: p,
      count: pFlips.length,
      amount: pFlips.reduce((sum, f) => sum + profitOf(f), 0),
    };
  }).filter((p) => p.count > 0);

  const maxPlatformAbs = Math.max(...platformData.map((p) => Math.abs(p.amount)), 1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.textMuted}
        />
      }
    >
      <Text style={styles.pageTitle}>Analytics</Text>

      {/* Best Job */}
      <View style={styles.bestFlipCard}>
        <Text style={styles.bestFlipLabel}>Best Job</Text>
        {bestFlip.itemName ? (
          <View style={styles.bestFlipContent}>
            <Text style={styles.bestFlipName}>{bestFlip.itemName}</Text>
            <Text style={[styles.bestFlipProfit, { color: bestFlip.profit >= 0 ? theme.brandText : theme.danger }]}>
              {bestFlip.profit >= 0 ? '+' : '-'}{symbol}{Math.abs(bestFlip.profit).toFixed(2)}
            </Text>
          </View>
        ) : (
          <Text style={styles.bestFlipEmpty}>No sold jobs yet</Text>
        )}
      </View>

      {/* Financial Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial Overview</Text>
        <Text style={styles.sectionSub}>Revenue and profit include sold jobs only.</Text>
        <View style={styles.finRow}>
          <View style={styles.finCard}>
            <Text style={styles.finLabel}>Realized Cost</Text>
            <Text style={styles.finValue}>{symbol}{realizedCost.toFixed(2)}</Text>
          </View>
          <View style={styles.finCard}>
            <Text style={styles.finLabel}>Total Revenue</Text>
            <Text style={styles.finValue}>{symbol}{totalRevenue.toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.finRow}>
          <View style={styles.finCard}>
            <Text style={styles.finLabel}>Net Profit</Text>
            <Text style={[styles.finValue, { color: totalProfit >= 0 ? theme.brandText : theme.danger, fontSize: 24 }]}>
              {totalProfit >= 0 ? '+' : '-'}{symbol}{Math.abs(totalProfit).toFixed(2)}
            </Text>
          </View>
          <View style={styles.finCard}>
            <Text style={styles.finLabel}>Open Job Cost</Text>
            <Text style={[styles.finValue, { fontSize: 24 }]}>{symbol}{openJobCost.toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.marginRow}>
          <Text style={styles.marginLabel}>Realized profit margin</Text>
          <Text style={[styles.marginValue, { color: parseFloat(profitMargin) >= 0 ? theme.brandText : theme.danger }]}>
            {parseFloat(profitMargin) >= 0 ? '+' : ''}{profitMargin}%
          </Text>
        </View>
      </View>

      {/* Performance */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.finRow}>
          <View style={styles.finCard}>
            <Text style={styles.finLabel}>Avg. Days to Sell</Text>
            <Text style={styles.finValue}>{avgDaysToSell !== null ? avgDaysToSell.toFixed(1) : '—'}</Text>
          </View>
          <View style={styles.finCard}>
            <Text style={styles.finLabel}>Sell-Through Rate</Text>
            <Text style={styles.finValue}>{sellThroughRate.toFixed(0)}%</Text>
          </View>
        </View>
      </View>

      {/* Platform Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profit by Platform</Text>
        {platformData.length === 0 ? (
          <Text style={styles.emptyText}>No sold jobs yet</Text>
        ) : (
          platformData.map((p) => (
            <BarRow
              key={p.label}
              label={p.label}
              count={p.count}
              amount={p.amount}
              maxAbs={maxPlatformAbs}
              symbol={symbol}
              styles={styles}
              positiveTextColor={theme.brandText}
              positiveFillColor={theme.brand}
            />
          ))
        )}
      </View>
    </ScrollView>
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
      paddingBottom: 32,
    },
    pageTitle: { fontSize: 24, fontWeight: '800', color: t.text, marginBottom: 16 },
    bestFlipCard: {
      backgroundColor: t.bestFlipCard,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    bestFlipLabel: {
      fontSize: 11,
      color: '#9ca3af',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    bestFlipContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    bestFlipName: { fontSize: 18, fontWeight: '700', color: t.bestFlipCardText, flex: 1, marginRight: 10 },
    bestFlipProfit: { fontSize: 24, fontWeight: '800', color: t.brandText },
    bestFlipEmpty: { color: '#64748b', fontSize: 14 },
    section: {
      backgroundColor: t.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: t.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: t.isDark ? 0.3 : 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: t.text, marginBottom: 2 },
    sectionSub: { fontSize: 12, color: t.textFaint, marginBottom: 12 },
    finRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    finCard: {
      flex: 1,
      backgroundColor: t.cardAlt,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: t.border,
    },
    finLabel: {
      fontSize: 11,
      color: t.textMuted,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 4,
    },
    finValue: { fontSize: 18, fontWeight: '700', color: t.text },
    marginRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: t.border,
    },
    marginLabel: { fontSize: 13, color: t.textMuted, fontWeight: '600' },
    marginValue: { fontSize: 16, fontWeight: '700' },
    catRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    catLeft: { flex: 1, marginRight: 12 },
    catLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    catName: { fontSize: 14, fontWeight: '600', color: t.textSub },
    catCount: { fontSize: 12, color: t.textFaint },
    barBg: { height: 6, backgroundColor: t.border, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3 },
    catProfit: { fontSize: 14, fontWeight: '700', minWidth: 70, textAlign: 'right' },
    emptyText: { color: t.textFaint, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  });
