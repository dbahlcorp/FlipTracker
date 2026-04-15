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
import { loadFlips, deleteFlip } from '../utils/storage';
import FlipCard from '../components/FlipCard';
import { useTheme } from '../context/ThemeContext';

const PLATFORMS = ['All', 'Facebook Marketplace', 'eBay', 'Kijiji', 'Other'];
const STATUSES = ['All', 'Active', 'Pending', 'Sold'];

export default function MyFlipsScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  const [flips, setFlips] = useState([]);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useFocusEffect(useCallback(() => { loadFlips().then(setFlips); }, []));

  const handleDelete = async (id) => {
    const updated = await deleteFlip(id);
    setFlips(updated);
  };

  const filtered = flips.filter((f) => {
    const matchSearch = f.itemName.toLowerCase().includes(search.toLowerCase());
    const matchPlatform = platformFilter === 'All' || f.platform === platformFilter;
    const matchStatus = statusFilter === 'All' || f.status === statusFilter;
    return matchSearch && matchPlatform && matchStatus;
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search flips..."
            placeholderTextColor={theme.placeholder}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearBtn}>✕</Text>
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
          >
            <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filtered.length} {filtered.length === 1 ? 'flip' : 'flips'}
        </Text>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No flips found</Text>
          <Text style={styles.emptySubtitle}>
            {flips.length === 0
              ? 'Tap the + button to add your first flip'
              : 'Try adjusting your filters'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FlipCard flip={item} onDelete={handleDelete} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddFlip')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
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
    searchIcon: { fontSize: 16, marginRight: 8 },
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
    filterChipActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
    filterChipText: { fontSize: 13, color: t.textMuted, fontWeight: '500' },
    filterChipTextActive: { color: '#fff', fontWeight: '700' },
    countRow: { paddingHorizontal: 16, paddingVertical: 8 },
    countText: { fontSize: 13, color: t.textFaint, fontWeight: '500' },
    list: { paddingTop: 4, paddingBottom: 100 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: t.textSub, marginBottom: 6 },
    emptySubtitle: { fontSize: 14, color: t.textFaint, textAlign: 'center', paddingHorizontal: 40 },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: '#22c55e',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#22c55e',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 8,
    },
    fabIcon: { fontSize: 28, color: '#fff', lineHeight: 32, marginTop: -2 },
  });
