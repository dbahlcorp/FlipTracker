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
import MetricCard from '../components/MetricCard';
import { useTheme } from '../context/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DashboardScreen() {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [flips, setFlips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const data = await loadFlips();
    setFlips(data);
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const totalProfit = flips.reduce((sum, f) => sum + calcProfit(f), 0);
  const totalFlips = flips.length;
  const activeListings = flips.filter((f) => f.status === 'Active').length;
  const soldFlips = flips.filter((f) => f.status === 'Sold');
  const avgMargin =
    soldFlips.length > 0
      ? soldFlips.reduce((sum, f) => {
          const buy = parseFloat(f.buyPrice) || 0;
          return sum + (buy > 0 ? (calcProfit(f) / buy) * 100 : 0);
        }, 0) / soldFlips.length
      : 0;

  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const month = d.getMonth();
    const year = d.getFullYear();
    const monthProfit = flips
      .filter((f) => {
        const date = new Date(f.dateSold || f.dateBought || f.createdAt);
        return date.getMonth() === month && date.getFullYear() === year;
      })
      .reduce((sum, f) => sum + Math.max(calcProfit(f), 0), 0);
    return { label: MONTH_LABELS[month], value: monthProfit };
  });

  const chartData = {
    labels: monthlyData.map((m) => m.label),
    datasets: [{ data: monthlyData.map((m) => m.value) }],
  };

  const platforms = ['Facebook Marketplace', 'eBay', 'Kijiji', 'Other'];
  const platformData = platforms
    .map((p) => {
      const pFlips = flips.filter((f) => f.platform === p);
      const pProfit = pFlips.reduce((sum, f) => sum + calcProfit(f), 0);
      return { platform: p, count: pFlips.length, profit: pProfit };
    })
    .filter((p) => p.count > 0);

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
      <View style={styles.header}>
        <Text style={styles.greeting}>Flip Tracker</Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <MetricCard
          label="Total Profit"
          value={`$${totalProfit.toFixed(2)}`}
          valueColor={totalProfit >= 0 ? '#22c55e' : '#ef4444'}
        />
        <MetricCard label="Total Flips" value={totalFlips.toString()} />
      </View>
      <View style={styles.metricsRow}>
        <MetricCard label="Active Listings" value={activeListings.toString()} valueColor="#3b82f6" />
        <MetricCard label="Avg Margin" value={`${avgMargin.toFixed(1)}%`} subtitle="on sold items" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monthly Profit</Text>
        <Text style={styles.sectionSub}>Last 6 months</Text>
        <View style={styles.chartContainer}>
          <BarChart
            data={chartData}
            width={SCREEN_WIDTH - 48}
            height={200}
            yAxisLabel="$"
            yAxisSuffix=""
            fromZero
            chartConfig={{
              backgroundColor: theme.chartBg,
              backgroundGradientFrom: theme.chartBg,
              backgroundGradientTo: theme.chartBg,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
              labelColor: () => theme.chartLabel,
              style: { borderRadius: 12 },
              propsForBackgroundLines: { stroke: theme.chartLine },
              barPercentage: 0.6,
            }}
            style={{ borderRadius: 12 }}
            showValuesOnTopOfBars
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Breakdown</Text>
        {platformData.length === 0 ? (
          <Text style={styles.emptyText}>No flips yet. Add your first flip!</Text>
        ) : (
          platformData.map((p) => (
            <View key={p.platform} style={styles.platformRow}>
              <View>
                <Text style={styles.platformName}>{p.platform}</Text>
                <Text style={styles.platformCount}>
                  {p.count} flip{p.count !== 1 ? 's' : ''}
                </Text>
              </View>
              <Text
                style={[
                  styles.platformProfit,
                  { color: p.profit >= 0 ? '#22c55e' : '#ef4444' },
                ]}
              >
                {p.profit >= 0 ? '+' : ''}${p.profit.toFixed(2)}
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
    content: { paddingBottom: 24 },
    header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    greeting: { fontSize: 24, fontWeight: '800', color: t.text },
    date: { fontSize: 13, color: t.textMuted, marginTop: 2 },
    metricsRow: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 8 },
    section: {
      backgroundColor: t.card,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 16,
      padding: 16,
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
    chartContainer: { alignItems: 'center', marginTop: 4 },
    platformRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: t.border,
    },
    platformName: { fontSize: 14, fontWeight: '600', color: t.textSub },
    platformCount: { fontSize: 12, color: t.textFaint, marginTop: 2 },
    platformProfit: { fontSize: 16, fontWeight: '700' },
    emptyText: { color: t.textFaint, fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  });
