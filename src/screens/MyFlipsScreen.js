import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { loadFlips, deleteFlip, updateFlip, calcProfit, getQuantity } from '../utils/storage';
import FlipCard from '../components/FlipCard';
import { useTheme } from '../context/ThemeContext';
import { BRAND } from '../constants';
import { useCurrency } from '../context/CurrencyContext';
import { useRates } from '../context/RatesContext';
import {
  PLATFORMS as PLATFORM_OPTIONS,
  STATUSES as STATUS_OPTIONS,
  TABLET_CONTENT_MAX_WIDTH,
} from '../constants';

const PLATFORMS = ['All', ...PLATFORM_OPTIONS];
const STATUSES = ['All', ...STATUS_OPTIONS];
const SORTS = ['Newest', 'Oldest', 'Profit ↑', 'Profit ↓', 'Cost ↑', 'A-Z'];

export default function MyFlipsScreen({ navigation }) {
  const { theme } = useTheme();
  const { convert } = useCurrency();
  const { labourRate, laserRate } = useRates();
  const rates = { labourRate, laserRate };
  const styles = makeStyles(theme);

  const [flips, setFlips] = useState([]);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');

  useFocusEffect(useCallback(() => { loadFlips().then(setFlips); }, []));

  const handleDelete = async (id) => {
    const updated = await deleteFlip(id);
    setFlips(updated);
  };

  const handleEdit = (flip) => navigation.navigate('EditFlip', { flip });

  const handleStatusChange = async (id, newStatus) => {
    const updated = await updateFlip(id, { status: newStatus });
    setFlips(updated);
  };

  const filtered = flips.filter((f) => {
    const matchSearch = (f.itemName || '').toLowerCase().includes(search.toLowerCase());
    const matchPlatform = platformFilter === 'All' || f.platform === platformFilter;
    const matchStatus = statusFilter === 'All' || f.status === statusFilter;
    return matchSearch && matchPlatform && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'Oldest':   return new Date(a.createdAt) - new Date(b.createdAt);
      case 'Profit ↑': return convert(calcProfit(a, rates), a.currency) - convert(calcProfit(b, rates), b.currency);
      case 'Profit ↓': return convert(calcProfit(b, rates), b.currency) - convert(calcProfit(a, rates), a.currency);
      case 'Cost ↑':   return convert((parseFloat(a.materialCost) || 0) * getQuantity(a), a.currency) - convert((parseFloat(b.materialCost) || 0) * getQuantity(b), b.currency);
      case 'A-Z':      return (a.itemName || '').localeCompare(b.itemName || '');
      default:         return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={19} color={theme.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search jobs..."
            placeholderTextColor={theme.placeholder}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search jobs"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              accessibilityRole="button"
              accessibilityLabel="Clear job search"
              hitSlop={10}
            >
              <Ionicons name="close-circle" size={20} color={theme.textFaint} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {PLATFORMS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.filterChip, platformFilter === p && styles.filterChipActive]}
            onPress={() => setPlatformFilter(p)}
            accessibilityRole="button"
            accessibilityState={{ selected: platformFilter === p }}
            accessibilityLabel={`Filter by platform: ${p}`}
          >
            <Text style={[styles.filterChipText, platformFilter === p && styles.filterChipTextActive]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {STATUSES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => setStatusFilter(s)}
            accessibilityRole="button"
            accessibilityState={{ selected: statusFilter === s }}
            accessibilityLabel={`Filter by status: ${s}`}
          >
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {sorted.length} {sorted.length === 1 ? 'job' : 'jobs'}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sortScroll}
          contentContainerStyle={styles.sortContent}
        >
          {SORTS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sortChip, sortBy === s && styles.sortChipActive]}
              onPress={() => setSortBy(s)}
              accessibilityRole="button"
              accessibilityState={{ selected: sortBy === s }}
              accessibilityLabel={`Sort jobs by ${s}`}
            >
              <Text style={[styles.sortChipText, sortBy === s && styles.sortChipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {sorted.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={52} color={theme.textFaint} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No jobs found</Text>
          <Text style={styles.emptySubtitle}>
            {flips.length === 0
              ? 'Tap the + button to add your first job'
              : 'Try adjusting your filters'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FlipCard
              flip={item}
              onDelete={handleDelete}
              onPress={handleEdit}
              onStatusChange={handleStatusChange}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddFlip')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add job"
      >
        <Ionicons name="add" size={32} color="#052e16" />
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: '100%',
      maxWidth: TABLET_CONTENT_MAX_WIDTH,
      alignSelf: 'center',
      backgroundColor: t.bg,
    },
    searchContainer: { padding: 16, paddingBottom: 8 },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      borderWidth: 1.5,
      borderColor: t.borderStrong,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 15, color: t.text, paddingVertical: 12 },
    clearBtn: { fontSize: 14, color: t.textFaint, padding: 4 },
    filterRow: { maxHeight: 44 },
    filterContent: { paddingHorizontal: 16, paddingBottom: 8, gap: 8, flexDirection: 'row' },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: t.card,
      borderWidth: 1.5,
      borderColor: t.borderStrong,
    },
    filterChipActive: { backgroundColor: BRAND.primary, borderColor: BRAND.primary },
    filterChipText: { fontSize: 13, color: t.textMuted, fontWeight: '500' },
    filterChipTextActive: { color: BRAND.onPrimary, fontWeight: '700' },
    countRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 16,
      paddingVertical: 6,
    },
    countText: { fontSize: 13, color: t.textFaint, fontWeight: '500', marginRight: 10 },
    sortScroll: { flex: 1 },
    sortContent: { flexDirection: 'row', gap: 6, paddingRight: 16 },
    sortChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: t.card,
      borderWidth: 1,
      borderColor: t.borderStrong,
    },
    sortChipActive: { backgroundColor: t.isDark ? '#1e3a5f' : '#dbeafe', borderColor: '#3b82f6' },
    sortChipText: { fontSize: 11, color: t.textFaint, fontWeight: '500' },
    sortChipTextActive: { color: t.isDark ? '#60a5fa' : '#2563eb', fontWeight: '700' },
    list: { paddingTop: 4, paddingBottom: 100 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
    emptyIcon: { marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: t.textSub, marginBottom: 6 },
    emptySubtitle: { fontSize: 14, color: t.textFaint, textAlign: 'center', paddingHorizontal: 40 },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: BRAND.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: BRAND.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    fabIcon: { fontSize: 28, color: '#fff', lineHeight: 32, marginTop: -2 },
  });
