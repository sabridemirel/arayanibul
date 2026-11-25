import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { productAPI } from '../services/api';
import type { ProductSummary } from '../services/api';
import { colors, spacing, borderRadius } from '../theme';

interface ProductPriceStripProps {
  onSelect: (slug: string) => void;
}

/** Home screen strip of "Gerçek Fiyat" products; the ones somebody is already looking for come first. */
const ProductPriceStrip: React.FC<ProductPriceStripProps> = ({ onSelect }) => {
  const [products, setProducts] = useState<ProductSummary[]>([]);

  useEffect(() => {
    productAPI
      .search('')
      .then((result) => setProducts([...result].sort((a, b) => b.seekerCount - a.seekerCount).slice(0, 8)))
      .catch(() => {
        // The strip is simply not shown (e.g. offline, or an API that predates products)
      });
  }, []);

  if (products.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Ekran kartlarında gerçek fiyat
      </Text>
      <Text style={styles.subtitle}>Alıcıların şu an ödemeye hazır olduğu fiyatlar.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {products.map((product) => (
          <TouchableOpacity
            key={product.id}
            onPress={() => onSelect(product.slug)}
            style={styles.card}
            accessibilityRole="button"
            accessibilityLabel={`${product.name}, ${
              product.realPrice ? `${Math.round(product.realPrice).toLocaleString('tr-TR')} TL` : 'henüz fiyat yok'
            }. Fiyat sayfasını aç`}
          >
            <Text style={styles.name}>{product.name}</Text>
            <Text style={product.realPrice ? styles.price : styles.noPrice}>
              {product.realPrice
                ? `${Math.round(product.realPrice).toLocaleString('tr-TR')} TL`
                : 'İlk fiyatı siz verin'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, paddingHorizontal: spacing.md },
  subtitle: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: spacing.md, marginTop: 2 },
  row: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  card: {
    minWidth: 140,
    minHeight: 64,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginRight: spacing.sm,
  },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  price: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: 2 },
  noPrice: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});

export default ProductPriceStrip;
