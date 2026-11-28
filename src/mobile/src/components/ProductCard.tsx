// A product buyers are waiting for, drawn like NeedCard so the home screen shows one kind of card.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { ProductSummary } from '../../services/api';
import { colors, spacing } from '../../theme';
import { getCategoryColor, getCategoryColorWithOpacity } from '../../utils/categoryUtils';

interface ProductCardProps {
  product: ProductSummary;
  onPress: (slug: string) => void;
  width?: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onPress, width }) => {
  const price = product.realPrice ? `${Math.round(product.realPrice).toLocaleString('tr-TR')} TL` : null;
  const seekers = `${product.seekerCount} kişi arıyor`;
  const categoryColor = getCategoryColor(product.categoryId);
  const categoryBgColor = getCategoryColorWithOpacity(product.categoryId, 0.15);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(product.slug)}
      style={[styles.container, width ? { width } : null]}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}. ${product.categoryName ?? ''}. ${
        price ? `Hemen alır: ${price}` : 'Teklife açık'
      }. ${seekers}.`}
      accessibilityHint="Ürünün fiyat sayfasını açmak için dokunun"
    >
      <View style={styles.card}>
        <Text style={styles.title} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.description} numberOfLines={1}>
          Elinizde varsa bu fiyata satın.
        </Text>
        <View style={styles.metaRow}>
          {product.categoryName ? (
            <View style={[styles.categoryBadge, { backgroundColor: categoryBgColor }]}>
              <MaterialIcons name="category" size={14} color={categoryColor} />
              <Text style={[styles.categoryText, { color: categoryColor }]} numberOfLines={1}>
                {product.categoryName}
              </Text>
            </View>
          ) : null}
          {price ? (
            <View style={styles.budgetBadge}>
              <MaterialIcons name="payments" size={16} color={colors.secondaryOrangeDark} />
              <Text style={styles.budgetText} numberOfLines={1}>
                Hemen alır: {price}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.footerRow}>
          <MaterialIcons name="group" size={14} color={colors.textSecondary} />
          <Text style={styles.footerText}>{seekers}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { marginRight: spacing.md, paddingBottom: spacing.md },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, lineHeight: 24, marginBottom: 6 },
  description: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 10 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    maxWidth: '48%',
  },
  categoryText: { fontSize: 13, fontWeight: '600' },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.secondaryOrangeLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    maxWidth: '60%',
  },
  budgetText: { fontSize: 13, fontWeight: '700', color: colors.secondaryOrangeDark },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
});

export default ProductCard;
