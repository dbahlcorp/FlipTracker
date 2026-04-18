import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Alert,
} from 'react-native';
import { calcProfit } from '../utils/storage';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = -80;

const STATUS_COLORS = {
  Sold:    { lightBg: '#dcfce7', darkBg: '#14532d', lightText: '#16a34a', darkText: '#4ade80' },
  Active:  { lightBg: '#dbeafe', darkBg: '#1e3a5f', lightText: '#2563eb', darkText: '#60a5fa' },
  Pending: { lightBg: '#fef9c3', darkBg: '#422006', lightText: '#a16207', darkText: '#fbbf24' },
};

const STATUSES = ['Active', 'Pending', 'Sold'];

export default function FlipCard({ flip, onDelete, onPress, onStatusChange }) {
  const { theme } = useTheme();
  const { symbol } = useCurrency();
  const styles = makeStyles(theme);

  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;

  const profit = calcProfit(flip);
  const profitColor = profit >= 0 ? '#22c55e' : '#ef4444';

  const s = STATUS_COLORS[flip.status] || STATUS_COLORS['Active'];
  const statusBg   = theme.isDark ? s.darkBg   : s.lightBg;
  const statusText = theme.isDark ? s.darkText  : s.lightText;

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 8 && Math.abs(g.dy) < 20,
    onPanResponderMove: (_, g) => {
      if (g.dx < 0) {
        translateX.setValue(Math.max(g.dx, -120));
        deleteOpacity.setValue(Math.min((-g.dx) / 120, 1));
      }
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx < SWIPE_THRESHOLD) {
        Animated.spring(translateX, { toValue: -120, useNativeDriver: true }).start();
        deleteOpacity.setValue(1);
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        Animated.timing(deleteOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      }
    },
  });

  const handleDelete = () => {
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onDelete(flip.id));
  };

  const handleLongPress = () => {
    if (!onStatusChange) return;
    Alert.alert('Change Status', flip.itemName, [
      ...STATUSES.map((status) => ({
        text: status === flip.status ? `${status} ✓` : status,
        onPress: () => onStatusChange(flip.id, status),
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.deleteBack, { opacity: deleteOpacity }]}>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => onPress && onPress(flip)}
          onLongPress={handleLongPress}
          activeOpacity={0.85}
        >
          <View style={styles.row}>
            {flip.photo ? (
              <Image source={{ uri: flip.photo }} style={styles.photo} />
            ) : null}
            <View style={styles.left}>
              <Text style={styles.itemName} numberOfLines={1}>
                {flip.itemName}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>{flip.category}</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.meta}>{flip.condition}</Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.meta}>{flip.platform}</Text>
              </View>
              {flip.notes ? (
                <Text style={styles.notes} numberOfLines={2}>{flip.notes}</Text>
              ) : null}
            </View>
            <View style={styles.right}>
              <Text style={[styles.profit, { color: profitColor }]}>
                {profit >= 0 ? '+' : '-'}{symbol}{Math.abs(profit).toFixed(2)}
              </Text>
              <View style={[styles.badge, { backgroundColor: statusBg }]}>
                <Text style={[styles.badgeText, { color: statusText }]}>
                  {flip.status}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.priceRow}>
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Bought</Text>
              <Text style={styles.priceValue}>{symbol}{parseFloat(flip.buyPrice || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Sold</Text>
              <Text style={styles.priceValue}>
                {flip.sellPrice ? `${symbol}${parseFloat(flip.sellPrice).toFixed(2)}` : '—'}
              </Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Fees</Text>
              <Text style={styles.priceValue}>{symbol}{parseFloat(flip.fees || 0).toFixed(2)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    container: {
      marginHorizontal: 16,
      marginBottom: 10,
      position: 'relative',
    },
    deleteBack: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 120,
      borderRadius: 12,
      backgroundColor: '#ef4444',
      justifyContent: 'center',
      alignItems: 'center',
    },
    deleteBtn: { padding: 12, alignItems: 'center' },
    deleteText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    card: {
      backgroundColor: t.card,
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: t.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: t.isDark ? 0.3 : 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    photo: {
      width: 56,
      height: 56,
      borderRadius: 8,
      marginRight: 10,
    },
    left: { flex: 1, marginRight: 10 },
    right: { alignItems: 'flex-end' },
    itemName: {
      fontSize: 15,
      fontWeight: '700',
      color: t.text,
      marginBottom: 4,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    meta: { fontSize: 12, color: t.textMuted },
    dot: { fontSize: 12, color: t.borderStrong, marginHorizontal: 4 },
    notes: {
      fontSize: 12,
      color: t.textFaint,
      marginTop: 4,
      fontStyle: 'italic',
    },
    profit: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
    badge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    priceRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: t.border,
      paddingTop: 10,
    },
    priceItem: { flex: 1, alignItems: 'center' },
    priceLabel: { fontSize: 10, color: t.textFaint, marginBottom: 2, textTransform: 'uppercase' },
    priceValue: { fontSize: 13, fontWeight: '600', color: t.textSub },
    priceDivider: { width: 1, backgroundColor: t.border },
  });
