import React, { useState } from 'react';
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const STEPS = [
  {
    icon: 'layers-outline',
    title: 'Know your true material cost',
    body: 'Record sheet stock, blanks, consumables, packaging, and shipping for every job.',
  },
  {
    icon: 'time-outline',
    title: 'Price your time',
    body: 'Set hourly labour and laser rates once. Kerf turns minutes into real production cost.',
  },
  {
    icon: 'receipt-outline',
    title: 'Include every fee',
    body: 'Add marketplace and selling fees so the number you see is the money you actually keep.',
  },
  {
    icon: 'trending-up-outline',
    title: 'Protect your margin',
    body: 'Preview profit and margin before saving, then compare results across jobs and platforms.',
  },
  {
    icon: 'copy-outline',
    title: 'Reuse what works',
    body: 'Save repeatable products as templates, then create consistent jobs without re-entering costs.',
  },
];

export default function OnboardingScreen({ visible, onComplete }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <SafeAreaView style={styles.screen}>
        <View style={styles.topRow}>
          <Text style={styles.brand}>Kerf</Text>
          {!isLast && (
            <TouchableOpacity
              onPress={onComplete}
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
              hitSlop={12}
            >
              <Text style={styles.skip}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        <View
          style={styles.content}
          accessible
          accessibilityLabel={`${current.title}. ${current.body}`}
        >
          <View style={styles.iconCircle}>
            <Ionicons name={current.icon} size={58} color={theme.brand} />
          </View>
          <Text style={styles.eyebrow}>STEP {step + 1} OF {STEPS.length}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>
        </View>

        <View>
          <View style={styles.dots} accessibilityLabel={`Page ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((item, index) => (
              <View
                key={item.title}
                style={[styles.dot, index === step && styles.dotActive]}
              />
            ))}
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={() => (isLast ? onComplete() : setStep((value) => value + 1))}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Start using Kerf' : 'Next onboarding page'}
          >
            <Text style={styles.buttonText}>{isLast ? 'Start Using Kerf' : 'Continue'}</Text>
            <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={20} color="#052e16" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (t) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: t.bg,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { color: t.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  skip: { color: t.textMuted, fontSize: 16, fontWeight: '600', padding: 8 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: t.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  eyebrow: {
    color: t.brandText,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  title: {
    color: t.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: 520,
  },
  body: {
    color: t.textMuted,
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
    maxWidth: 520,
    marginTop: 16,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.borderStrong },
  dotActive: { width: 24, backgroundColor: t.brand },
  button: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: t.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: { color: '#052e16', fontSize: 17, fontWeight: '800' },
});
