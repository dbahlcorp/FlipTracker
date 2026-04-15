import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import { loadFlips, calcProfit } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CATEGORIES = ['Phones', 'Laptops', 'Headphones', 'Watches', 'Tablets', 'Other'];
const PLATFORMS = ['Facebook Marketplace', 'eBay', 'Kijiji', 'Other'];
const PLATFORM_SHORT = {
  'Facebook Marketplace': 'FB Mkt',
  eBay: 'eBay',
  Kijiji: 'Kijiji',
  Other: 'Other',
};

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [flips, setFlips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { loadFlips().then(setFlips); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFlips().then(setFlips);
    setRefreshing(false);
  };

  const soldFlips = flips.filter((f) => f.status === 'Sold');
  const bestFlip = soldFlips.reduce(
    (best, f) => {
      const p = calcProfit(f);
      return p > best.profit ? { ...f, profit: p } : best;
    },
    { profit: -Infinity, itemName: null }
  );

  const totalInvested = flips.reduce((sum, f) => sum + (parseFloat(f.buyPrice) || 0), 0);
  const totalRevenue = flips.reduce((sum, f) => sum + (parseFloat(f.sellPrice) || 0), 0);
  const totalProfit = flips.reduce((sum, f) => sum + calcProfit(f), 0);
  const roi = totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(1) : '0.0';

  const platformProfits = PLATFORMS.map((p) => {
    const pFlips = flips.filter((f) => f.platform === p);
    return Math.max(pFlips.reduce((sum, f) => sum + calcProfit(f), 0), 0);
  });

  const platformChartData = {
    labels: PLATFORMS.map((p) => PLATFORM_SHORT[p]),
    datasets: [{ data: platformProfits.length > 0 ? platformProfits : [0, 0, 0, 0] }],
  };

  const categoryData = CATEGORIES.map((cat) => {
    const cFlips = flips.filter((f) => f.category === cat);
    const cProfit = cFlips.reduce((sum, f) => sum + calcProfit(f), 0);
    return { cat, count: cFlips.length, profit: cProfit };
  })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.profit - a.profit);

  const maxCatProfit = Math.max(...categoryData.map((c) => Math.abs(c.profit)), 1);

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

      {/* Best Flip */}
      <View style={styles.bestFlipCard}>
        <Text style={styles.bestFlipLabel}>Best Flip</Text>
        {bestFlip.itemName ? (
          <View style={styles.bestFlipContent}>
            <Text style={styles.bestFlipName}>{bestFlip.itemName}</Text>
            <Text style={styles.bestFlipProfit}>+${bestFlip.profit.toFixed(2)}</Text>
          </View>
        ) : (
          <Text style={styles.bestFlipEmpty}>No sold flips yet</Text>
        )}
      </View>

      {/* Financial Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial Overview</Text>
        <View style={styles.finRow}>
          <View style={styles.finCard}>
            <Text style={styles.finLabel}>Total Invested</Text>
            <Text style={styles.finValue}>${totalInvested.toFixed(2)}</Text>
          </View>
          <View style={styles.finCard}>
            <Text style={styles.finLabel}>Total Revenue</Text>
            <Text style={styles.finValue}>${totalRevenue.toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.finRow}>
          <View style={styles.finCard}>
            <Text style={styles.finLabel}>Net Profit</Text>
            <Text style={[styles.finValue, { color: totalProfit >= 0 ? '#22c55e' : '#ef4444', fontSize: 24 }]}>
              {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
            </Text>
          </View>
          <View style={styles.finCard}>
            <Text style={styles.finLabel}>ROI</Text>
            <Text style={[styles.finValue, { color: parseFloat(roi) >= 0 ? '#22c55e' : '#ef4444', fontSize: 24 }]}>
              {parseFloat(roi) >= 0 ? '+' : ''}{roi}%
            </Text>
          </View>
        </View>
      </View>

      {/* Platform Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profit by Platform</Text>
        <Text style={styles.sectionSub}>Positive profit only</Text>
        <View style={styles.chartContainer}>
          <BarChart
            data={platformChartData}
            width={SCREEN_WIDTH - 64}
            height={180}
            yAxisLabel="$"
            fromZero
            chartConfig={{
              backgroundColor: theme.chartBg,
              backgroundGradientFrom: theme.chartBg,
              backgroundGradientTo: theme.chartBg,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              labelColor: () => theme.chartLabel,
              propsForBackgroundLines: { stroke: theme.chartLine },
              barPercentage: 0.5,
            }}
            style={{ borderRadius: 12 }}
            showValuesOnTopOfBars
          />
        </View>
      </View>

      {/* Category Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        {categoryData.length === 0 ? (
          <Text style={styles.emptyText}>No data yet</Text>
        ) : (
          categoryData.map((c) => (
            <View key={c.cat} style={styles.catRow}>
              <View style={styles.catLeft}>
                <View style={styles.catLabelRow}>
                  <Text style={styles.catName}>{c.cat}</Text>
                  <Text style={styles.catCount}>
                    {c.count} flip{c.count !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${(Math.abs(c.profit) / maxCatProfit) * 100}%`,
                        backgroundColor: c.profit >= 0 ? '#22c55e' : '#ef4444',
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.catProfit, { color: c.profit >= 0 ? '#22c55e' : '#ef4444' }]}>
                {c.profit >= 0 ? '+' : ''}${c.profit.toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    content: { padding: 16, paddingBottom: 32 },
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
    bestFlipProfit: { fontSize: 24, fontWeight: '800', color: '#22c55e' },
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
    chartContainer: { alignItems: 'center', marginTop: 8 },
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
