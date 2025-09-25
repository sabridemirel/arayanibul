import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Offer, RootStackParamList } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import { colors, spacing, typography } from '../theme';

type OfferListNavigationProp = StackNavigationProp<RootStackParamList>;

interface OfferListScreenProps {
  offers: Offer[];
  loading: boolean;
  onAcceptOffer: (offerId: number) => Promise<void>;
  onRejectOffer: (offerId: number) => Promise<void>;
  onRefresh?: () => void;
  isOwner: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

const OfferListScreen: React.FC<OfferListScreenProps> = ({
  offers,
  loading,
  onAcceptOffer,
  onRejectOffer,
  onRefresh,
  isOwner,
}) => {
  const navigation = useNavigation<OfferListNavigationProp>();
  const [sortBy, setSortBy] = useState<'price' | 'date' | 'rating'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showComparison, setShowComparison] = useState(false);

  const sortOptions = [
    { key: 'date', label: 'Tarihe Göre', icon: 'schedule' },
    { key: 'price', label: 'Fiyata Göre', icon: 'attach-money' },
    { key: 'rating', label: 'Puana Göre', icon: 'star' },
  ];

  const sortedOffers = [...offers].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'price':
        comparison = a.price - b.price;
        break;
      case 'date':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'rating':
        const aRating = a.provider?.rating || 0;
        const bRating = b.provider?.rating || 0;
        comparison = aRating - bRating;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const pendingOffers = sortedOffers.filter(offer => offer.status === 'Pending');
  const acceptedOffers = sortedOffers.filter(offer => offer.status === 'Accepted');
  const rejectedOffers = sortedOffers.filter(offer => offer.status === 'Rejected');

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const handleAcceptOffer = async (offerId: number) => {
    Alert.alert(
      'Teklifi Kabul Et',
      'Bu teklifi kabul etmek istediğinizden emin misiniz? Diğer teklifler otomatik olarak reddedilecektir.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kabul Et',
          onPress: () => onAcceptOffer(offerId),
        },
      ]
    );
  };

  const handleRejectOffer = async (offerId: number) => {
    Alert.alert(
      'Teklifi Reddet',
      'Bu teklifi reddetmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: () => onRejectOffer(offerId),
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return colors.warning;
      case 'Accepted':
        return colors.success;
      case 'Rejected':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'Bekleyen';
      case 'Accepted':
        return 'Kabul Edildi';
      case 'Rejected':
        return 'Reddedildi';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSortButton = (option: typeof sortOptions[0]) => (
    <TouchableOpacity
      key={option.key}
      style={[
        styles.sortButton,
        sortBy === option.key && styles.sortButtonActive,
      ]}
      onPress={() => handleSort(option.key as typeof sortBy)}
    >
      <MaterialIcons 
        name={option.icon as any} 
        size={16} 
        color={sortBy === option.key ? colors.surface : colors.textSecondary} 
      />
      <Text
        style={[
          styles.sortButtonText,
          sortBy === option.key && styles.sortButtonTextActive,
        ]}
      >
        {option.label}
      </Text>
      {sortBy === option.key && (
        <MaterialIcons
          name={sortOrder === 'asc' ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={16}
          color={colors.surface}
        />
      )}
    </TouchableOpacity>
  );

  const renderOfferItem = (offer: Offer, showActions = true) => (
    <Card key={offer.id} style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <View style={styles.providerInfo}>
          <MaterialIcons name="person" size={20} color={colors.primary} />
          <View style={styles.providerDetails}>
            <Text style={styles.providerName}>
              {offer.provider?.firstName} {offer.provider?.lastName}
            </Text>
            {offer.provider?.rating && (
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={14} color={colors.warning} />
                <Text style={styles.ratingText}>
                  {offer.provider.rating.toFixed(1)}
                </Text>
                {offer.provider.reviewCount && (
                  <Text style={styles.reviewCountText}>
                    ({offer.provider.reviewCount})
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.offerPrice}>
            {offer.price.toLocaleString()} {offer.currency}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(offer.status) }]}>
            <Text style={styles.statusText}>
              {getStatusText(offer.status)}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.offerDescription}>{offer.description}</Text>

      <View style={styles.offerMeta}>
        <View style={styles.metaItem}>
          <MaterialIcons name="schedule" size={16} color={colors.textSecondary} />
          <Text style={styles.metaText}>
            {offer.deliveryDays} gün içinde teslim
          </Text>
        </View>
        <Text style={styles.offerDate}>
          {formatDate(offer.createdAt)}
        </Text>
      </View>

      {showActions && offer.status === 'Pending' && isOwner && (
        <View style={styles.offerActions}>
          <Button
            title="Mesajlaş"
            variant="ghost"
            size="small"
            onPress={() => navigation.navigate('Chat', { offerId: offer.id })}
            icon="message"
            style={styles.offerActionButton}
          />
          <Button
            title="Reddet"
            variant="outline"
            size="small"
            onPress={() => handleRejectOffer(offer.id)}
            style={styles.offerActionButton}
          />
          <Button
            title="Kabul Et"
            size="small"
            onPress={() => handleAcceptOffer(offer.id)}
            style={styles.offerActionButton}
          />
        </View>
      )}

      {offer.status === 'Accepted' && (
        <View style={styles.acceptedContainer}>
          <View style={styles.acceptedInfo}>
            <MaterialIcons name="check-circle" size={20} color={colors.success} />
            <Text style={styles.acceptedText}>
              Bu teklif kabul edildi
            </Text>
          </View>
          <Button
            title="Mesajlaş"
            size="small"
            onPress={() => {
              navigation.navigate('Chat', { offerId: offer.id });
            }}
            icon="message"
          />
        </View>
      )}
    </Card>
  );

  const renderComparisonView = () => (
    <View style={styles.comparisonContainer}>
      <View style={styles.comparisonHeader}>
        <Text style={styles.comparisonTitle}>Teklif Karşılaştırması</Text>
        <TouchableOpacity onPress={() => setShowComparison(false)}>
          <MaterialIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.comparisonTable}>
          {/* Header */}
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonCell}>
              <Text style={styles.comparisonHeaderText}>Sağlayıcı</Text>
            </View>
            <View style={styles.comparisonCell}>
              <Text style={styles.comparisonHeaderText}>Fiyat</Text>
            </View>
            <View style={styles.comparisonCell}>
              <Text style={styles.comparisonHeaderText}>Teslimat</Text>
            </View>
            <View style={styles.comparisonCell}>
              <Text style={styles.comparisonHeaderText}>Puan</Text>
            </View>
          </View>
          
          {/* Data rows */}
          {pendingOffers.slice(0, 5).map((offer) => (
            <View key={offer.id} style={styles.comparisonRow}>
              <View style={styles.comparisonCell}>
                <Text style={styles.comparisonCellText}>
                  {offer.provider?.firstName} {offer.provider?.lastName}
                </Text>
              </View>
              <View style={styles.comparisonCell}>
                <Text style={styles.comparisonCellText}>
                  {offer.price.toLocaleString()} TL
                </Text>
              </View>
              <View style={styles.comparisonCell}>
                <Text style={styles.comparisonCellText}>
                  {offer.deliveryDays} gün
                </Text>
              </View>
              <View style={styles.comparisonCell}>
                <Text style={styles.comparisonCellText}>
                  {offer.provider?.rating?.toFixed(1) || 'N/A'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  if (offers.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <MaterialIcons name="local-offer" size={48} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>Henüz teklif yok</Text>
        <Text style={styles.emptyDescription}>
          İhtiyacınıza henüz kimse teklif vermedi. Bekleyin veya ihtiyacınızı düzenleyin.
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Teklifler ({offers.length})
        </Text>
        <View style={styles.headerActions}>
          {pendingOffers.length > 1 && (
            <TouchableOpacity
              style={styles.compareButton}
              onPress={() => setShowComparison(!showComparison)}
            >
              <MaterialIcons name="compare-arrows" size={20} color={colors.primary} />
              <Text style={styles.compareButtonText}>Karşılaştır</Text>
            </TouchableOpacity>
          )}
          {onRefresh && (
            <TouchableOpacity onPress={onRefresh}>
              <MaterialIcons name="refresh" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortScrollContent}
        >
          {sortOptions.map(renderSortButton)}
        </ScrollView>
      </View>

      {/* Comparison View */}
      {showComparison && renderComparisonView()}

      {/* Offers List */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Pending Offers */}
        {pendingOffers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Bekleyen Teklifler ({pendingOffers.length})
            </Text>
            {pendingOffers.map(offer => renderOfferItem(offer))}
          </View>
        )}

        {/* Accepted Offers */}
        {acceptedOffers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Kabul Edilen Teklifler ({acceptedOffers.length})
            </Text>
            {acceptedOffers.map(offer => renderOfferItem(offer, false))}
          </View>
        )}

        {/* Rejected Offers */}
        {rejectedOffers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Reddedilen Teklifler ({rejectedOffers.length})
            </Text>
            {rejectedOffers.map(offer => renderOfferItem(offer, false))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
  },
  compareButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  sortContainer: {
    marginBottom: spacing.lg,
  },
  sortScrollContent: {
    paddingRight: spacing.lg,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  sortButtonTextActive: {
    color: colors.surface,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  offerCard: {
    marginBottom: spacing.md,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  providerDetails: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  providerName: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  reviewCountText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  offerPrice: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.surface,
  },
  offerDescription: {
    fontSize: typography.body.fontSize,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  offerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  offerDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  offerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  offerActionButton: {
    flex: 1,
  },
  acceptedContainer: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  acceptedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.successLight,
    borderRadius: 8,
  },
  acceptedText: {
    fontSize: 14,
    color: colors.success,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  comparisonContainer: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  comparisonTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  comparisonTable: {
    minWidth: screenWidth - spacing.lg * 4,
  },
  comparisonRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  comparisonCell: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    minWidth: 80,
  },
  comparisonHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  comparisonCellText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyDescription: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default OfferListScreen;