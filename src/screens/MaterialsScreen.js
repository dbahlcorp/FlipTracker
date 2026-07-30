import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';
import { calcMaterialValue, loadMaterials } from '../utils/storage';
import { TABLET_CONTENT_MAX_WIDTH } from '../constants';

const pluralizeUnit = (unit, quantity) => {
  const value = unit || 'piece';
  return quantity === 1 ? value : `${value}s`;
};

export default function MaterialsScreen({ navigation }) {
  const { theme } = useTheme();
  const { symbol, convert } = useCurrency();
  const styles = makeStyles(theme);
  const [materials, setMaterials] = useState([]);
  const [query, setQuery] = useState('');

  useFocusEffect(useCallback(() => {
    loadMaterials().then(setMaterials);
  }, []));

  const filteredMaterials = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return materials;
    return materials.filter((material) =>
      [material.name, material.type, material.supplier]
        .some((value) => value?.toLowerCase().includes(normalized))
    );
  }, [materials, query]);

  const inventoryValue = materials.reduce(
    (total, material) => total + convert(calcMaterialValue(material), material.currency),
    0
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Total Material Value</Text>
            <Text style={styles.summaryValue}>{symbol}{inventoryValue.toFixed(2)}</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countValue}>{materials.length}</Text>
            <Text style={styles.countLabel}>materials</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color={theme.textFaint} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search materials, type, or supplier"
            placeholderTextColor={theme.placeholder}
            accessibilityLabel="Search materials"
          />
          {query ? (
            <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={19} color={theme.textFaint} />
            </TouchableOpacity>
          ) : null}
        </View>

        {filteredMaterials.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="layers-outline" size={32} color={theme.brandText} />
            </View>
            <Text style={styles.emptyTitle}>
              {materials.length === 0 ? 'No materials yet' : 'No matching materials'}
            </Text>
            <Text style={styles.emptyText}>
              {materials.length === 0
                ? 'Add sheets, boards, pieces, and rolls to track your stock cost.'
                : 'Try another name, type, or supplier.'}
            </Text>
          </View>
        ) : (
          filteredMaterials.map((material) => {
            const quantity = parseFloat(material.quantity) || 0;
            const cost = convert(parseFloat(material.costPerPiece) || 0, material.currency);
            const value = convert(calcMaterialValue(material), material.currency);
            const dimensions = [material.width, material.height, material.thickness]
              .filter(Boolean)
              .join(' × ');

            return (
              <TouchableOpacity
                key={material.id}
                style={styles.materialCard}
                onPress={() => navigation.navigate('EditMaterial', { material })}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${material.name}`}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.cardTitleArea}>
                    <Text style={styles.materialName} numberOfLines={1}>{material.name}</Text>
                    <Text style={styles.materialType}>{material.type || 'Other'}</Text>
                  </View>
                  <Text style={styles.materialValue}>{symbol}{value.toFixed(2)}</Text>
                </View>
                <View style={styles.cardDetails}>
                  <View style={styles.detailPill}>
                    <Text style={styles.detailText}>
                      {quantity} {pluralizeUnit(material.unit, quantity)}
                    </Text>
                  </View>
                  <Text style={styles.costText}>{symbol}{cost.toFixed(2)} each</Text>
                  {dimensions ? <Text style={styles.dimensionText}>{dimensions}</Text> : null}
                </View>
                {material.supplier ? (
                  <Text style={styles.supplier} numberOfLines={1}>
                    <Ionicons name="storefront-outline" size={12} /> {material.supplier}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddMaterial')}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={20} color={theme.onBrand} />
          <Text style={styles.addButtonText}>Add Material</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: {
    width: '100%',
    maxWidth: TABLET_CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: t.bestFlipCard,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  summaryLabel: { fontSize: 12, color: t.textFaint, fontWeight: '700', textTransform: 'uppercase' },
  summaryValue: { fontSize: 28, color: t.bestFlipCardText, fontWeight: '800', marginTop: 4 },
  countBadge: { alignItems: 'center', backgroundColor: t.brand, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 13 },
  countValue: { color: t.onBrand, fontSize: 18, fontWeight: '800' },
  countLabel: { color: t.onBrand, fontSize: 10, fontWeight: '600' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.borderStrong,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchInput: { flex: 1, color: t.text, fontSize: 14, paddingVertical: 12, paddingHorizontal: 8 },
  materialCard: {
    backgroundColor: t.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.border,
    padding: 14,
    marginBottom: 10,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitleArea: { flex: 1, marginRight: 12 },
  materialName: { color: t.text, fontSize: 16, fontWeight: '700' },
  materialType: { color: t.textFaint, fontSize: 12, marginTop: 3 },
  materialValue: { color: t.brandText, fontSize: 17, fontWeight: '800' },
  cardDetails: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 11, gap: 8 },
  detailPill: { backgroundColor: t.brandTint, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  detailText: { color: t.brandText, fontSize: 12, fontWeight: '700' },
  costText: { color: t.textMuted, fontSize: 12, fontWeight: '600' },
  dimensionText: { color: t.textFaint, fontSize: 12 },
  supplier: { color: t.textFaint, fontSize: 12, marginTop: 10 },
  empty: { alignItems: 'center', paddingVertical: 50, paddingHorizontal: 24 },
  emptyIcon: { backgroundColor: t.brandTint, padding: 14, borderRadius: 28, marginBottom: 12 },
  emptyTitle: { color: t.text, fontSize: 16, fontWeight: '700' },
  emptyText: { color: t.textFaint, fontSize: 13, textAlign: 'center', lineHeight: 18, marginTop: 6 },
  addButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.brand,
    borderRadius: 12,
    paddingVertical: 15,
    marginTop: 4,
  },
  addButtonText: { color: t.onBrand, fontSize: 15, fontWeight: '700' },
});
