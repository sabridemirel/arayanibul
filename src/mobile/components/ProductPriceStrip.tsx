import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { productAPI } from '../services/api';
import type { ProductSummary } from '../services/api';
import { colors, spacing } from '../theme';
import ProductCard from '../src/components/ProductCard';

interface ProductPriceStripProps {
  onSelect: (slug: string) => void;
}

/** Home screen strip of "Gerçek Fiyat" products; the ones somebody is already looking for come first. */
const ProductPriceStrip: React.FC<ProductPriceStripProps> = ({ onSelect }) => {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  // Wide cards like the listing cards below, with the next one peeking in
  const cardWidth = Math.min(useWindowDimensions().width * 0.85, 420);

  useEffect(() => {
    productAPI
      .search('')
      .then((result) => setProducts(result.filter((product) => product.realPrice != null).slice(0, 8)))
      .catch(() => {
        // The strip is simply not shown (e.g. offline, or an API that predates products)
      });
  }, []);

  if (products.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Alıcısı hazır ürünler
      </Text>
      <Text style={styles.subtitle}>Bu fiyatlara şu an alıcı var. Elinizde varsa teklif verin.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onPress={onSelect} width={cardWidth} />
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
});

export default ProductPriceStrip;
