import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { offerAPI } from '../services/api';
import { Offer } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import ErrorMessage from '../components/ui/ErrorMessage';
import { colors, spacing, typography } from '../theme';
import { RootStackParamList } from '../types';

type MyOffersScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MyOffers'>;

const { width: screenWidth } = Dimensions.get('window');

const MyOffersScreen: React.FC = () => {
  const navigation = useNavigation<MyOffersScreenNavigationProp>();
  const { user } = useAuth();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const filterOptions = [
    { key: 'all', label: 'Tümü', count: offers.length },
    { key: 'Pending', label: 'Bekleyen', count: offers.filter(o => o.status === 'Pending').length },
    { key: 'Accepted', label: 'Kabul Edilen', count: offers.filter(o => o.status === 'Accepted').length },
    { key: 'Rejected', label: 'Reddedilen', count: offers.filter(o => o.status === 'Rejected').length },
  ];

  useFocusEffect(
    useCallback(() => {
      loadOffers();
    }, [])
  );

  const loadOffers = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const offersData = await offerAPI.getMyOffers();
      setOffers(offersData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Teklifler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadOffers(true);
  };

  const handleOfferPress = (offer: Offer) => {
    if (offer.need) {
      navigation.navigate('NeedDetail', { needId: offer.need.id });
    }
  };

  const handleWithdrawOffer = async (offerId: number) => {
    Alert.alert(
      'Teklifi Geri Çek',
      'Bu teklifi geri çekmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Geri Çek',
          style: 'destructive',
          onPress: async () => {
            try {
              // Note: This endpoint might need to be implemented in the backend
              // For now, we'll show a message
              Alert.alert('Bilgi', 'Teklif geri çekme özelliği yakında eklenecek.');
            } catch (err: any) {
              Alert.alert('Hata', err.response?.data?.message || 'Teklif geri çekilirken hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleReviewBuyer = (offer: Offer) => {
    if (!offer.need?.user) {
      Alert.alert('Hata', 'Alıcı bilgileri bulunamadı.');
      return;
    }

    navigation.navigate('Review', {
      revieweeId: offer.need.userId,
      revieweeName: `${offer.need.user.firstName} ${offer.need.user.lastName}`,
      offerId: offer.id,
      mode: 'create',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return colors.warning;
      case 'Accepted':
        return colors.success;
      case 'Rejected':
        return colors.error;
      case 'Withdrawn':
        return colors.textSecondary;
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
      case 'Withdrawn':
        return 'Geri Çekildi';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'schedule';
      case 'Accepted':
        return 'check-circle';
      case 'Rejected':
        return 'cancel';
      case 'Withdrawn':
        return 'undo';
      default:
        return 'help';
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

  const filteredOffers = selectedFilter === 'all' 
    ? offers 
    : offers.filter(offer => offer.status === selectedFilter);

  const renderFilterButton = (filter: typeof filterOptions[0]) => (
    <TouchableOpacity
      key={filter.key}
      style={[
        styles.filterButton,
        selectedFilter === filter.key && styles.filterButtonActive,
      ]}
      onPress={() => setSelectedFilter(filter.key)}
    >
      <Text
        style={[
          styles.filterButtonText,
          selectedFilter === filter.key && styles.filterButtonTextActive,
        ]}
      >
        {filter.label}
      </Text>
      {filter.count > 0 && (
        <View style={[
          styles.filterBadge,
          selectedFilter === filter.key && styles.filterBadgeActive,
        ]}>
          <Text style={[
            styles.filterBadgeText,
            selectedFilter === filter.key && styles.filterBadgeTextActive,
          ]}>
            {filter.count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderOfferItem = (offer: Offer) => (
    <Card key={offer.id} style={styles.offerCard}>
      <TouchableOpacity onPress={() => handleOfferPress(offer)}>
        <View style={styles.offerHeader}>
          <View style={styles.offerTitleContainer}>
            <Text style={styles.offerTitle} numberOfLines={2}>
              {offer.need?.title || 'İhtiyaç'}
            </Text>
            <View style={styles.statusContainer}>
              <MaterialIcons 
                name={getStatusIcon(offer.status) as any} 
                size={16} 
                color={getStatusColor(offer.status)} 
              />
              <Text style={[styles.statusText, { color: getStatusColor(offer.status) }]}>
                {getStatusText(offer.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.offerPrice}>
            {offer.price.toLocaleString()} {offer.currency}
          </Text>
        </View>

        <Text style={styles.offerDescription} numberOfLines={3}>
          {offer.description}
        </Text>

        <View style={styles.offerMeta}>
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {offer.deliveryDays} gün teslimat
            </Text>
          </View>
          <Text style={styles.offerDate}>
            {formatDate(offer.createdAt)}
          </Text>
        </View>

        {offer.need?.category && (
          <View style={styles.categoryContainer}>
            <MaterialIcons name="category" size={14} color={colors.textSecondary} />
            <Text style={styles.categoryText}>
              {offer.need.category.nameTr}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {offer.status === 'Pending' && (
        <View style={styles.offerActions}>
          <Button
            title="Geri Çek"
            variant="outline"
            size="small"
            onPress={() => handleWithdrawOffer(offer.id)}
            style={styles.actionButton}
          />
          <Button
            title="Detayları Gör"
            size="small"
            onPress={() => handleOfferPress(offer)}
            style={styles.actionButton}
          />
        </View>
      )}

      {offer.status === 'Accepted' && (
        <View style={styles.acceptedActions}>
          <View style={styles.acceptedInfo}>
            <MaterialIcons name="check-circle" size={20} color={colors.success} />
            <Text style={styles.acceptedText}>
              Teklifiniz kabul edildi! Mesajlaşmaya başlayabilirsiniz.
            </Text>
          </View>
          <View style={styles.acceptedButtons}>
            <Button
              title="Mesajlaş"
              size="small"
              onPress={() => {
                // Navigate to chat screen (will be implemented later)
                Alert.alert('Bilgi', 'Mesajlaşma özelliği yakında eklenecek.');
              }}
              icon="message"
              style={styles.actionButton}
            />
            <Button
              title="Değerlendir"
              size="small"
              variant="outline"
              onPress={() => handleReviewBuyer(offer)}
              icon="star"
              style={styles.actionButton}
            />
          </View>
        </View>
      )}
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tekliflerim</Text>
          <View style={{ width: 24 }} />
        </View>
        <Loading text="Teklifler yükleniyor..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tekliflerim</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <MaterialIcons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {filterOptions.map(renderFilterButton)}
        </ScrollView>
      </View>

      {error ? (
        <ErrorMessage 
          message={error} 
          onRetry={() => loadOffers()} 
          showRetry 
        />
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {filteredOffers.length === 0 ? (
            <Card style={styles.emptyCard}>
              <MaterialIcons name="local-offer" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>
                {selectedFilter === 'all' ? 'Henüz teklif yok' : `${filterOptions.find(f => f.key === selectedFilter)?.label} teklif yok`}
              </Text>
              <Text style={styles.emptyDescription}>
                {selectedFilter === 'all' 
                  ? 'Henüz hiç teklif vermediniz. İhtiyaçlara göz atın ve teklif verin.'
                  : 'Bu durumda teklif bulunmuyor.'
                }
              </Text>
              {selectedFilter === 'all' && (
                <Button
                  title="İhtiyaçlara Göz At"
                  onPress={() => navigation.navigate('Main')}
                  style={styles.emptyButton}
                />
              )}
            </Card>
          ) : (
            <>
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>
                  {filteredOffers.length} teklif gösteriliyor
                </Text>
              </View>
              {filteredOffers.map(renderOfferItem)}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
  },
  filterContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterButton: {
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
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.surface,
  },
  filterBadge: {
    backgroundColor: colors.textSecondary,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.sm,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: colors.surface,
  },
  filterBadgeText: {
    fontSize: 12,
    color: colors.surface,
    fontWeight: '600',
  },
  filterBadgeTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  statsContainer: {
    marginBottom: spacing.md,
  },
  statsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  offerCard: {
    marginBottom: spacing.lg,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  offerTitleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  offerTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  offerPrice: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.primary,
  },
  offerDescription: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  offerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  offerActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
  },
  acceptedActions: {
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
    flex: 1,
    lineHeight: 20,
  },
  acceptedButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
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
    marginBottom: spacing.lg,
  },
  emptyButton: {
    marginTop: spacing.md,
  },
});

export default MyOffersScreen;