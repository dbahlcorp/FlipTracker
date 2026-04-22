import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadFlips, calcProfit } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';

const VIEWS = ['Daily', 'Monthly', 'Yearly'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getFlipDateKey(flip) {
  if (flip.dateSold) return flip.dateSold;
  if (flip.dateBought) return flip.dateBought;
  return flip.createdAt ? flip.createdAt.split('T')[0] : null;
}

function getCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function CalendarScreen() {
  const { theme } = useTheme();
  const { symbol } = useCurrency();
  const styles = makeStyles(theme);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(todayDate);

  const [view, setView] = useState('Monthly');
  const [flips, setFlips] = useState([]);
  const [selectedDay, setSelectedDay] = useState(todayDate);
  const [navMonth, setNavMonth] = useState(todayDate.getMonth());
  const [navYear, setNavYear] = useState(todayDate.getFullYear());

  useFocusEffect(useCallback(() => { loadFlips().then(setFlips); }, []));

  const byDate = useMemo(() => {
    const map = {};
    flips.forEach((flip) => {
      const key = getFlipDateKey(flip);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(flip);
    });
    return map;
  }, [flips]);

  const byMonth = useMemo(() => {
    const map = {};
    flips.forEach((flip) => {
      const key = getFlipDateKey(flip);
      if (!key) return;
      const mKey = key.slice(0, 7); // "YYYY-MM"
      if (!map[mKey]) map[mKey] = { profit: 0, revenue: 0, count: 0 };
      map[mKey].profit += calcProfit(flip);
      map[mKey].revenue += parseFloat(flip.sellPrice) || 0;
      map[mKey].count += 1;
    });
    return map;
  }, [flips]);

  const getDayStats = (dateKey) => {
    const dayFlips = byDate[dateKey] || [];
    return {
      flips: dayFlips,
      profit: dayFlips.reduce((s, f) => s + calcProfit(f), 0),
      revenue: dayFlips.reduce((s, f) => s + (parseFloat(f.sellPrice) || 0), 0),
      count: dayFlips.length,
    };
  };

  const selectedDayKey = toDateKey(selectedDay);
  const selectedStats = getDayStats(selectedDayKey);

  const goToPrevMonth = () => {
    if (navMonth === 0) { setNavMonth(11); setNavYear((y) => y - 1); }
    else setNavMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    if (navMonth === 11) { setNavMonth(0); setNavYear((y) => y + 1); }
    else setNavMonth((m) => m + 1);
  };
  const goToToday = () => {
    setSelectedDay(todayDate);
    setNavMonth(todayDate.getMonth());
    setNavYear(todayDate.getFullYear());
  };

  // ─── MONTHLY VIEW ───────────────────────────────────────────────────────────
  const renderMonthly = () => {
    const grid = getCalendarGrid(navYear, navMonth);
    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={goToPrevMonth}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday}>
            <Text style={styles.navTitle}>{MONTH_NAMES[navMonth]} {navYear}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={goToNextMonth}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dayLabelRow}>
          {DAY_LABELS.map((d, i) => (
            <Text key={i} style={styles.dayLabel}>{d}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {grid.map((day, i) => {
            if (!day) return <View key={`pad-${i}`} style={styles.cell} />;
            const dateKey = `${navYear}-${String(navMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const stats = getDayStats(dateKey);
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDayKey;
            const profit = stats.profit;
            return (
              <TouchableOpacity
                key={dateKey}
                style={[styles.cell, isSelected && styles.cellSelected]}
                onPress={() => setSelectedDay(new Date(navYear, navMonth, day))}
                activeOpacity={0.7}
              >
                <View style={[styles.dayCircle, isToday && styles.dayCircleToday]}>
                  <Text style={[
                    styles.dayText,
                    isToday && styles.dayTextToday,
                    isSelected && !isToday && styles.dayTextSelected,
                  ]}>
                    {day}
                  </Text>
                </View>
                {stats.count > 0 && (
                  <Text
                    style={[styles.cellProfit, { color: profit >= 0 ? '#22c55e' : '#ef4444' }]}
                    numberOfLines={1}
                  >
                    {profit >= 0 ? '+' : '-'}{symbol}{Math.abs(profit).toFixed(0)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected day panel */}
        <View style={styles.dayPanel}>
          <View style={styles.dayPanelHeader}>
            <Text style={styles.dayPanelDate}>
              {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            {selectedStats.count > 0 && (
              <Text style={[styles.dayPanelProfit, { color: selectedStats.profit >= 0 ? '#22c55e' : '#ef4444' }]}>
                {selectedStats.profit >= 0 ? '+' : '-'}{symbol}{Math.abs(selectedStats.profit).toFixed(2)}
              </Text>
            )}
          </View>
          {selectedStats.count === 0 ? (
            <Text style={styles.emptyText}>No activity on this day</Text>
          ) : (
            selectedStats.flips.map((flip) => {
              const p = calcProfit(flip);
              return (
                <View key={flip.id} style={styles.miniFlipRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.miniFlipName} numberOfLines={1}>{flip.itemName}</Text>
                    <Text style={styles.miniFlipMeta}>{flip.status} · {flip.category}</Text>
                  </View>
                  <Text style={[styles.miniFlipProfit, { color: p >= 0 ? '#22c55e' : '#ef4444' }]}>
                    {p >= 0 ? '+' : '-'}{symbol}{Math.abs(p).toFixed(2)}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    );
  };

  // ─── DAILY VIEW ─────────────────────────────────────────────────────────────
  const renderDaily = () => {
    const stats = getDayStats(selectedDayKey);
    const isToday = selectedDayKey === todayKey;

    const prevDay = () => {
      const d = new Date(selectedDay);
      d.setDate(d.getDate() - 1);
      setSelectedDay(d);
      setNavMonth(d.getMonth());
      setNavYear(d.getFullYear());
    };
    const nextDay = () => {
      const d = new Date(selectedDay);
      d.setDate(d.getDate() + 1);
      setSelectedDay(d);
      setNavMonth(d.getMonth());
      setNavYear(d.getFullYear());
    };

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={prevDay}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToToday}>
            <Text style={[styles.navTitle, isToday && { color: '#22c55e' }]}>
              {selectedDay.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={nextDay}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Profit</Text>
            <Text style={[styles.statValue, { color: stats.profit >= 0 ? '#22c55e' : '#ef4444' }]}>
              {stats.profit >= 0 ? '+' : '-'}{symbol}{Math.abs(stats.profit).toFixed(2)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Revenue</Text>
            <Text style={styles.statValue}>{symbol}{stats.revenue.toFixed(2)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Flips</Text>
            <Text style={styles.statValue}>{stats.count}</Text>
          </View>
        </View>

        {stats.count === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No activity</Text>
            <Text style={styles.emptySubtitle}>No flips on this day</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            {stats.flips.map((flip) => {
              const p = calcProfit(flip);
              return (
                <View key={flip.id} style={styles.flipCard}>
                  <View style={styles.flipCardTop}>
                    <Text style={styles.flipCardName} numberOfLines={1}>{flip.itemName}</Text>
                    <Text style={[styles.flipCardProfit, { color: p >= 0 ? '#22c55e' : '#ef4444' }]}>
                      {p >= 0 ? '+' : '-'}{symbol}{Math.abs(p).toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.flipCardMeta}>{flip.category} · {flip.condition} · {flip.platform}</Text>
                  <View style={styles.flipCardPrices}>
                    <Text style={styles.priceChip}>Buy {symbol}{parseFloat(flip.buyPrice || 0).toFixed(2)}</Text>
                    <Text style={styles.priceChip}>
                      Sell {flip.sellPrice ? `${symbol}${parseFloat(flip.sellPrice).toFixed(2)}` : '—'}
                    </Text>
                    <Text style={styles.priceChip}>Fees {symbol}{parseFloat(flip.fees || 0).toFixed(2)}</Text>
                  </View>
                  {flip.notes ? <Text style={styles.flipCardNotes} numberOfLines={2}>{flip.notes}</Text> : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  // ─── YEARLY VIEW ────────────────────────────────────────────────────────────
  const renderYearly = () => {
    const yearFlips = flips.filter((f) => {
      const key = getFlipDateKey(f);
      return key && key.startsWith(`${navYear}`);
    });
    const yearProfit = yearFlips.reduce((s, f) => s + calcProfit(f), 0);
    const yearRevenue = yearFlips.reduce((s, f) => s + (parseFloat(f.sellPrice) || 0), 0);

    const maxMonthProfit = Math.max(
      ...Array.from({ length: 12 }, (_, i) => {
        const mKey = `${navYear}-${String(i + 1).padStart(2, '0')}`;
        return Math.abs((byMonth[mKey] || {}).profit || 0);
      }),
      1
    );

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => setNavYear((y) => y - 1)}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setNavYear(todayDate.getFullYear())}>
            <Text style={styles.navTitle}>{navYear}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => setNavYear((y) => y + 1)}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Year Profit</Text>
            <Text style={[styles.statValue, { color: yearProfit >= 0 ? '#22c55e' : '#ef4444', fontSize: 15 }]}>
              {yearProfit >= 0 ? '+' : '-'}{symbol}{Math.abs(yearProfit).toFixed(2)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Revenue</Text>
            <Text style={[styles.statValue, { fontSize: 15 }]}>{symbol}{yearRevenue.toFixed(2)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Flips</Text>
            <Text style={styles.statValue}>{yearFlips.length}</Text>
          </View>
        </View>

        <View style={styles.yearGrid}>
          {Array.from({ length: 12 }, (_, i) => {
            const mKey = `${navYear}-${String(i + 1).padStart(2, '00')}`;
            const stats = byMonth[mKey] || { profit: 0, revenue: 0, count: 0 };
            const isCurrent = i === todayDate.getMonth() && navYear === todayDate.getFullYear();
            const barWidth = stats.count > 0
              ? `${(Math.abs(stats.profit) / maxMonthProfit) * 100}%`
              : '0%';

            return (
              <TouchableOpacity
                key={mKey}
                style={[styles.monthRow, isCurrent && styles.monthRowCurrent]}
                onPress={() => {
                  setNavMonth(i);
                  setSelectedDay(new Date(navYear, i, isCurrent ? todayDate.getDate() : 1));
                  setView('Monthly');
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.monthRowLabel, isCurrent && { color: '#22c55e' }]}>
                  {MONTH_SHORT[i]}
                </Text>
                <View style={styles.monthBarBg}>
                  <View style={[
                    styles.monthBarFill,
                    { width: barWidth, backgroundColor: stats.profit >= 0 ? '#22c55e' : '#ef4444' },
                  ]} />
                </View>
                <View style={styles.monthRowRight}>
                  {stats.count > 0 ? (
                    <>
                      <Text style={[styles.monthProfit, { color: stats.profit >= 0 ? '#22c55e' : '#ef4444' }]}>
                        {stats.profit >= 0 ? '+' : '-'}{symbol}{Math.abs(stats.profit).toFixed(0)}
                      </Text>
                      <Text style={styles.monthCount}>{stats.count} flip{stats.count !== 1 ? 's' : ''}</Text>
                    </>
                  ) : (
                    <Text style={styles.monthEmpty}>—</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.switcher}>
        {VIEWS.map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.switchTab, view === v && styles.switchTabActive]}
            onPress={() => setView(v)}
          >
            <Text style={[styles.switchTabText, view === v && styles.switchTabTextActive]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {view === 'Monthly' && renderMonthly()}
        {view === 'Daily' && renderDaily()}
        {view === 'Yearly' && renderYearly()}
      </View>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },

    switcher: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
      backgroundColor: t.card,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: t.border,
    },
    switchTab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
    switchTabActive: { backgroundColor: '#22c55e' },
    switchTabText: { fontSize: 13, fontWeight: '600', color: t.textMuted },
    switchTabTextActive: { color: '#fff', fontWeight: '700' },

    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    navBtn: { padding: 8 },
    navArrow: { fontSize: 30, color: t.textMuted, lineHeight: 34 },
    navTitle: { fontSize: 17, fontWeight: '700', color: t.text },

    // Monthly calendar
    dayLabelRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 2 },
    dayLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: t.textFaint },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
    cell: { width: '14.28%', minHeight: 60, alignItems: 'center', paddingVertical: 4, borderRadius: 8 },
    cellSelected: { backgroundColor: t.isDark ? '#1e3a5f' : '#dbeafe' },
    dayCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    dayCircleToday: { backgroundColor: '#22c55e' },
    dayText: { fontSize: 13, fontWeight: '500', color: t.text },
    dayTextToday: { color: '#fff', fontWeight: '700' },
    dayTextSelected: { color: t.isDark ? '#60a5fa' : '#2563eb', fontWeight: '700' },
    cellProfit: { fontSize: 9, fontWeight: '700', marginTop: 1 },

    dayPanel: {
      margin: 16,
      backgroundColor: t.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: t.border,
    },
    dayPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    dayPanelDate: { fontSize: 14, fontWeight: '700', color: t.text, flex: 1, marginRight: 8 },
    dayPanelProfit: { fontSize: 18, fontWeight: '800' },
    emptyText: { fontSize: 13, color: t.textFaint, textAlign: 'center', paddingVertical: 8 },
    miniFlipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: t.border,
    },
    miniFlipName: { fontSize: 14, fontWeight: '600', color: t.text },
    miniFlipMeta: { fontSize: 11, color: t.textFaint, marginTop: 2 },
    miniFlipProfit: { fontSize: 14, fontWeight: '700' },

    // Daily / shared
    statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16, gap: 10 },
    statCard: {
      flex: 1,
      backgroundColor: t.card,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: t.border,
      alignItems: 'center',
    },
    statLabel: { fontSize: 10, color: t.textFaint, fontWeight: '500', textTransform: 'uppercase', marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: '700', color: t.text },

    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: t.textSub, marginBottom: 4 },
    emptySubtitle: { fontSize: 14, color: t.textFaint },

    flipCard: {
      backgroundColor: t.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: t.border,
    },
    flipCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    flipCardName: { fontSize: 15, fontWeight: '700', color: t.text, flex: 1, marginRight: 8 },
    flipCardProfit: { fontSize: 16, fontWeight: '700' },
    flipCardMeta: { fontSize: 12, color: t.textMuted, marginBottom: 10 },
    flipCardPrices: {
      flexDirection: 'row',
      gap: 8,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: t.border,
    },
    priceChip: { fontSize: 12, color: t.textSub, fontWeight: '500' },
    flipCardNotes: { fontSize: 12, color: t.textFaint, fontStyle: 'italic', marginTop: 6 },

    // Yearly
    yearGrid: {
      marginHorizontal: 16,
      backgroundColor: t.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      padding: 8,
    },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
    monthRowCurrent: { backgroundColor: t.isDark ? '#1e293b' : '#f0fdf4' },
    monthRowLabel: { fontSize: 13, fontWeight: '600', color: t.textMuted, width: 36 },
    monthBarBg: { flex: 1, height: 6, backgroundColor: t.border, borderRadius: 3, overflow: 'hidden', marginHorizontal: 10 },
    monthBarFill: { height: 6, borderRadius: 3 },
    monthRowRight: { width: 86, alignItems: 'flex-end' },
    monthProfit: { fontSize: 13, fontWeight: '700' },
    monthCount: { fontSize: 10, color: t.textFaint, marginTop: 1 },
    monthEmpty: { fontSize: 13, color: t.textFaint },
  });
