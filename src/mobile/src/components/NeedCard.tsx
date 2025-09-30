// NeedCard.tsx - Modern, eye-catching Need card component
import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Need } from '../types';
import { colors, spacing } from '../../theme';
import { getCategoryColor, getCategoryTextColor, getCategoryColorWithOpacity } from '../../utils/categoryUtils';

interface NeedCardProps {
  need: Need;
  onPress: (needId: number) => void;
}

const NeedCard: React.FC<NeedCardProps> = ({ need, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
  };

  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case 'Urgent':
        return {
          color: colors.secondaryOrangeDark, // Dark orange (4.52:1 - WCAG AA with white text)
          text: 'ACİL',
          icon: 'priority-high' as const,
        };
      case 'Normal':
        return {
          color: colors.primary, // Purple (4.88:1 - WCAG AA)
          text: 'NORMAL',
          icon: 'schedule' as const,
        };
      case 'Flexible':
        return {
          color: colors.flexible, // Green (4.56:1 - WCAG AA)
          text: 'ESNEK',
          icon: 'event-available' as const,
        };
      default:
        return {
          color: colors.textSecondary,
          text: urgency.toUpperCase(),
          icon: 'schedule' as const,
        };
    }
  };

  const formatBudget = (minBudget?: number, maxBudget?: number, currency = 'TRY') => {
    if (!minBudget && !maxBudget) return null;

    const symbol = currency === 'TRY' ? '₺' : currency;

    if (minBudget && maxBudget) {
      return `${symbol}${minBudget.toLocaleString('tr-TR')} - ${symbol}${maxBudget.toLocaleString('tr-TR')}`;
    }
    if (minBudget) {
      return `${symbol}${minBudget.toLocaleString('tr-TR')}+`;
    }
    if (maxBudget) {
      return `Max ${symbol}${maxBudget.toLocaleString('tr-TR')}`;
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Az önce';
    if (diffInHours < 24) return `${diffInHours}s önce`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}g önce`;

    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const urgencyConfig = getUrgencyConfig(need.urgency);
  const budgetText = formatBudget(need.minBudget, need.maxBudget, need.currency);
  const hasImage = need.images && need.images.length > 0;

  // Category colors
  const categoryColor = getCategoryColor(need.categoryId);
  const categoryTextColor = getCategoryTextColor(need.categoryId);
  const categoryBgColor = getCategoryColorWithOpacity(need.categoryId, 0.15);

  // Accessibility label for screen readers
  const accessibilityLabel = `${need.title}. ${need.description}. ${urgencyConfig.text}. ${
    need.category?.nameTr || 'Kategori belirtilmemiş'
  }. ${budgetText || 'Bütçe belirtilmemiş'}. ${
    need.user?.firstName || 'Kullanıcı'
  } tarafından ${formatDate(need.createdAt)} paylaşıldı${
    need.offerCount ? `. ${need.offerCount} teklif var` : ''
  }.`;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => onPress(need.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Bu ihtiyacın detaylarını görüntülemek için dokunun"
      >
        <View style={styles.card}>
          {/* Urgency Badge - Prominent */}
          <View
            style={[styles.urgencyBadge, { backgroundColor: urgencyConfig.color }]}
            accessible={false} // Parent TouchableOpacity handles accessibility
          >
            <MaterialIcons name={urgencyConfig.icon} size={16} color="#ffffff" />
            <Text style={styles.urgencyText} allowFontScaling={true} accessible={false}>
              {urgencyConfig.text}
            </Text>
          </View>

          {/* Content Container */}
          <View style={styles.contentContainer}>
            {/* Image Thumbnail - Left Side */}
            {hasImage && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: need.images![0] }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Text Content */}
            <View style={[styles.textContent, !hasImage && styles.textContentFull]}>
              {/* Title - 18px Bold */}
              <Text
                style={styles.title}
                numberOfLines={2}
                allowFontScaling={true}
                accessible={false}
              >
                {need.title}
              </Text>

              {/* Description - 14px, 2 lines */}
              <Text
                style={styles.description}
                numberOfLines={2}
                allowFontScaling={true}
                accessible={false}
              >
                {need.description}
              </Text>

              {/* Meta Info Row */}
              <View style={styles.metaRow}>
                {/* Category - Color Coded */}
                <View style={[styles.categoryBadge, { backgroundColor: categoryBgColor }]}>
                  <MaterialIcons name="category" size={14} color={categoryColor} />
                  <Text
                    style={[styles.categoryText, { color: categoryColor }]}
                    numberOfLines={1}
                    allowFontScaling={true}
                    accessible={false}
                  >
                    {need.category?.nameTr || 'Kategori'}
                  </Text>
                </View>

                {/* Budget */}
                {budgetText && (
                  <View style={styles.budgetBadge}>
                    <MaterialIcons name="payments" size={16} color={colors.secondaryOrangeDark} />
                    <Text
                      style={styles.budgetText}
                      numberOfLines={1}
                      allowFontScaling={true}
                      accessible={false}
                    >
                      {budgetText}
                    </Text>
                  </View>
                )}
              </View>

              {/* Footer Row */}
              <View style={styles.footerRow}>
                {/* User Info */}
                <View style={styles.userInfo}>
                  <MaterialIcons name="account-circle" size={14} color={colors.textSecondary} />
                  <Text
                    style={styles.userText}
                    numberOfLines={1}
                    allowFontScaling={true}
                    accessible={false}
                  >
                    {need.user?.firstName || 'Kullanıcı'}
                  </Text>
                </View>

                {/* Time and Offers */}
                <View style={styles.rightInfo}>
                  <Text style={styles.timeText} allowFontScaling={true} accessible={false}>
                    {formatDate(need.createdAt)}
                  </Text>
                  {need.offerCount !== undefined && need.offerCount > 0 && (
                    <View style={styles.offerBadge}>
                      <MaterialIcons name="local-offer" size={12} color="#ffffff" />
                      <Text style={styles.offerText} allowFontScaling={true} accessible={false}>
                        {need.offerCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Location - Full Width Bottom */}
          {need.address && (
            <View style={styles.locationBar}>
              <MaterialIcons name="location-on" size={14} color={colors.error} />
              <Text
                style={styles.locationText}
                numberOfLines={1}
                allowFontScaling={true}
                accessible={false}
              >
                {need.address}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',

    // Enhanced shadow with purple tint
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  // Prominent Urgency Badge
  urgencyBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 5,
    zIndex: 10,

    // Enhanced badge shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.8,
  },

  // Content Layout
  contentContainer: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: spacing.md,
    backgroundColor: colors.background,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  textContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  textContentFull: {
    // When no image
  },

  // Typography - Enhanced Hierarchy
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },

  // Meta Info
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    // backgroundColor applied inline with category color
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    maxWidth: '48%',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    // color applied inline with category color
  },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.secondaryOrangeLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    maxWidth: '48%',
  },
  budgetText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondaryOrangeDark,
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  userText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  rightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondaryOrangeDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,

    // Badge shadow
    ...Platform.select({
      ios: {
        shadowColor: colors.secondaryOrangeDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  offerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Location Bar
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default NeedCard;