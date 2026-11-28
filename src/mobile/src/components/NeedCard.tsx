// Listing card, laid out like the web card (src/web/src/components/NeedCard.tsx) so a listing looks
// the same everywhere. Two fixed marks tell the four kinds apart:
//   - urgency: an "Acil" tag in the corner of the square (or nothing)
//   - type: the price line, "15.000 TL [Hemen alır]" or "Teklife açık"
// The square on the left is the first photo, or a category-coloured tile when there is none,
// so cards line up whether or not a photo was added.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Need } from '../../types';
import { colors, spacing } from '../../theme';
import { getCategoryVisual, useCategories } from '../../utils/categoryVisual';

interface NeedCardProps {
  need: Need;
  onPress: (needId: number) => void;
}

const URGENT_TAG = '#B45309';
const URGENT_BORDER = 'rgba(245, 158, 11, 0.6)';

const formatPrice = (value: number) => `${Math.round(value).toLocaleString('tr-TR')} TL`;

/** Older listings may still carry a budget range; fixed-price listings carry one price. */
const formatBudget = (need: Need): string | null => {
  if (need.isFixedPrice && need.maxBudget) return formatPrice(need.maxBudget);
  const { minBudget, maxBudget } = need;
  if (minBudget && maxBudget) {
    return minBudget === maxBudget ? formatPrice(maxBudget) : `${formatPrice(minBudget)} – ${formatPrice(maxBudget)}`;
  }
  if (maxBudget) return `En fazla ${formatPrice(maxBudget)}`;
  if (minBudget) return `En az ${formatPrice(minBudget)}`;
  return null;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const diffInHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (diffInHours < 1) return 'Az önce';
  if (diffInHours < 24) return `${diffInHours} saat önce`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} gün önce`;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

const NeedCard: React.FC<NeedCardProps> = ({ need, onPress }) => {
  const categories = useCategories();
  const visual = getCategoryVisual(need.categoryId, categories);
  // A photo that fails to load falls back to the category tile
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = photoFailed ? undefined : need.images?.[0];
  const isUrgent = need.urgency === 'Urgent';
  const isFixedPrice = Boolean(need.isFixedPrice && need.maxBudget);
  const budget = formatBudget(need);
  const categoryName = need.category?.nameTr || need.category?.name;
  const offerCount = need.offerCount ?? 0;
  const age = formatDate(need.createdAt);

  const accessibilityLabel = [
    isUrgent ? 'Acil ilan' : null,
    need.title,
    categoryName,
    budget ? (isFixedPrice ? `Hemen alır, ${budget}` : budget) : 'Teklife açık',
    need.address,
    offerCount > 0 ? `${offerCount} teklif` : null,
    age,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(need.id)}
      style={[styles.card, isUrgent && styles.cardUrgent]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="İlanın ayrıntılarını açar"
    >
      <View style={[styles.tile, !photo && { backgroundColor: visual.background }]}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" onError={() => setPhotoFailed(true)} />
        ) : (
          <Image source={visual.image} style={styles.photo} resizeMode="cover" accessible={false} />
        )}
        {isUrgent && (
          <View style={styles.urgentTag}>
            <MaterialIcons name="local-fire-department" size={12} color="#ffffff" />
            <Text style={styles.urgentText}>Acil</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        {categoryName ? (
          <Text style={[styles.category, { color: visual.foreground }]} numberOfLines={1}>
            {categoryName}
          </Text>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>
          {need.title}
        </Text>
        <Text style={styles.description} numberOfLines={1}>
          {need.description}
        </Text>

        <View style={styles.bottom}>
          <View style={styles.priceRow}>
            <Text style={budget ? styles.price : styles.open}>{budget ?? 'Teklife açık'}</Text>
            {isFixedPrice && (
              <View style={styles.fixedTag}>
                <Text style={styles.fixedText}>Hemen alır</Text>
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <View style={styles.location}>
              {need.address ? (
                <>
                  <MaterialIcons name="place" size={14} color={colors.textSecondary} />
                  <Text style={styles.meta} numberOfLines={1}>
                    {need.address}
                  </Text>
                </>
              ) : null}
            </View>
            <Text style={styles.meta}>
              {offerCount > 0 ? <Text style={styles.offers}>{offerCount} teklif  </Text> : null}
              {age}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const TILE = 88;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 12,
    marginBottom: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardUrgent: { borderColor: URGENT_BORDER },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  photo: { width: '100%', height: '100%' },
  urgentTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: URGENT_TAG,
  },
  urgentText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  body: { flex: 1, minWidth: 0 },
  category: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '600', color: colors.text, lineHeight: 21, marginTop: 2 },
  description: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  bottom: { marginTop: 'auto', paddingTop: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  price: { fontSize: 16, fontWeight: '700', color: colors.primary },
  open: { fontSize: 14, color: colors.textSecondary },
  fixedTag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#F1E9FA' },
  fixedText: { fontSize: 12, fontWeight: '600', color: colors.primaryDark },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 },
  meta: { fontSize: 12, color: colors.textSecondary },
  offers: { fontWeight: '600', color: colors.primary },
});

export default NeedCard;
