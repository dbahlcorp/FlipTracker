import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function MetricCard({ label, value, valueColor, subtitle }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const makeStyles = (t) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: t.card,
      borderRadius: 12,
      padding: 14,
      marginHorizontal: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: t.isDark ? 0.3 : 0.06,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
      borderColor: t.border,
      minWidth: 80,
    },
    label: {
      fontSize: 11,
      color: t.textMuted,
      fontWeight: '500',
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    value: {
      fontSize: 20,
      fontWeight: '700',
      color: t.text,
    },
    subtitle: {
      fontSize: 11,
      color: t.textFaint,
      marginTop: 2,
    },
  });
