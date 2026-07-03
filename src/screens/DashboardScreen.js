import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import { loadFlips, calcProfit, loadGoal, saveGoal } from '../utils/storage';
import MetricCard from '../components/MetricCard';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { PLATFORMS } from '../constants';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { symbol } = useCurrency();
  const styles = makeStyles(theme);

  const [flips, setFlips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [goal, setGoal] = useState(0);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const fetchData = async () => {
    const [data, g] = await Promise.all([loadFlips(), loadGoal()]);
    setFlips(data);
    setGoal(g);
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

  const currentMonthProfit = flips
    .filter((f) => {
      const date = new Date(f.dateSold || f.dateBought || f.createdAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, f) => sum + Math.max(calcProfit(f), 0), 0);

  const goalProgress = goal > 0 ? Math.min(currentMonthProfit / goal, 1) : 0;
  const goalBarColor = goalProgress >= 1 ? '#22c55e' : goalProgress >= 0.5 ? '#f59e0b' : '#3b82f6';

  const chartData = {
    labels: monthlyData.map((m) => m.label),
    datasets: [{ data: monthlyData.map((m) => m.value) }],
  };

  const platformData = PLATFORMS
    .map((p) => {
      const pFlips = flips.filter((f) => f.platform === p);
      const pProfit = pFlips.reduce((sum, f) => sum + calcProfit(f), 0);
      return { platform: p, count: pFlips.length, profit: pProfit };
    })
    .filter((p) => p.count > 0);

  const handleSaveGoal = async () => {
    const g = parseFloat(goalInput) || 0;
    setGoal(g);
    await saveGoal(g);
    setShowGoalModal(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
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
            value={`${totalProfit >= 0 ? '' : '-'}${symbol}${Math.abs(totalProfit).toFixed(2)}`}
            valueColor={totalProfit >= 0 ? '#22c55e' : '#ef4444'}
          />
          <MetricCard label="Total Flips" value={totalFlips.toString()} />
        </View>
        <View style={styles.metricsRow}>
          <MetricCard label="Active Listings" value={activeListings.toString()} valueColor="#3b82f6" />
          <MetricCard label="Avg Margin" value={`${avgMargin.toFixed(1)}%`} subtitle="on sold items" />
        </View>

        {/* Monthly Goal */}
        <TouchableOpacity
          style={styles.goalCard}
          onPress={() => {
            setGoalInput(goal > 0 ? goal.toString() : '');
            setShowGoalModal(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.goalHeader}>
            <Text style={styles.goalTitle}>Monthly Goal</Text>
            <Text style={styles.goalEdit}>{goal > 0 ? 'Edit' : 'Set Goal'}</Text>
          </View>
          {goal > 0 ? (
            <>
              <View style={styles.goalBarBg}>
                <View style={[styles.goalBarFill, { width: `${goalProgress * 100}%`, backgroundColor: goalBarColor }]} />
              </View>
              <View style={styles.goalFooter}>
                <Text style={styles.goalAmount}>
                  {symbol}{currentMonthProfit.toFixed(2)}
                  <Text style={styles.goalOf}> / {symbol}{goal.toFixed(2)}</Text>
                </Text>
                <Text style={[styles.goalPct, { color: goalBarColor }]}>
                  {Math.round(goalProgress * 100)}%
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.goalEmpty}>Tap to set a monthly profit goal</Text>
          )}
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Profit</Text>
          <Text style={styles.sectionSub}>Last 6 months</Text>
          <View style={styles.chartContainer}>
            <BarChart
              data={chartData}
              width={SCREEN_WIDTH - 48}
              height={200}
              yAxisLabel={symbol}
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
                  {p.profit >= 0 ? '+' : '-'}{symbol}{Math.abs(p.profit).toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showGoalModal} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Monthly Profit Goal</Text>
            <View style={styles.modalInputWrapper}>
              <Text style={styles.modalPrefix}>{symbol}</Text>
              <TextInput
                style={styles.modalInput}
                value={goalInput}
                onChangeText={setGoalInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.placeholder}
                autoFocus
              />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowGoalModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveGoal}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
    goalCard: {
      backgroundColor: t.card,
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 8,
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
    goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    goalTitle: { fontSize: 15, fontWeight: '700', color: t.text },
    goalEdit: { fontSize: 13, fontWeight: '600', color: '#22c55e' },
    goalBarBg: { height: 8, backgroundColor: t.border, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    goalBarFill: { height: 8, borderRadius: 4 },
    goalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    goalAmount: { fontSize: 14, fontWeight: '700', color: t.text },
    goalOf: { fontSize: 13, fontWeight: '400', color: t.textMuted },
    goalPct: { fontSize: 14, fontWeight: '700' },
    goalEmpty: { fontSize: 13, color: t.textFaint },
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: t.card,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 360,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: t.text, marginBottom: 16 },
    modalInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.inputBg,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: t.borderStrong,
      paddingHorizontal: 12,
      marginBottom: 20,
    },
    modalPrefix: { fontSize: 16, color: t.textMuted, marginRight: 4 },
    modalInput: { flex: 1, fontSize: 18, color: t.text, paddingVertical: 12 },
    modalBtns: { flexDirection: 'row', gap: 12 },
    modalCancel: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: t.borderStrong,
      alignItems: 'center',
    },
    modalCancelText: { fontSize: 15, fontWeight: '600', color: t.textMuted },
    modalSave: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 10,
      backgroundColor: '#22c55e',
      alignItems: 'center',
    },
    modalSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
