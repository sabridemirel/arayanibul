import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { needAPI, offerAPI } from '../services/api';
import { Need } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import ErrorMessage from '../components/ui/ErrorMessage';
import { colors, spacing, typography } from '../theme';
import { RootStackParamList } from '../types';

type MyNeedsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type NeedStatus = 'All' | 'Active' | 'InProgress' | 'Completed' | 'Cancelled' | 'Expired';

const MyNeedsScreen: React.FC = () => {
  const navigation = useNavigation<MyNeedsScreenNavigationProp>();
  const { user } = useAuth();

  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<NeedStatus>('All');

  const statusOptions: { key: NeedStatus; label: string; count?: number }[] = [
    { key: 'All', label: 'Tümü' },
    { key: 'Active', label: 'Aktif' },
    { key: 'InProgress', label: 'Devam Eden' },
    { key: 'Completed', label: 'Tamamlanan' },
    { key: 'Cancelled', label: 'İptal Edilen' },
    { key: 'Expired', label: 'Süresi Dolan' },
  ];

  const loadMyNeeds = useCallback(async (refresh = false) => {
    if (!user) return;

    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const status = selectedStatus === 'All' ? undefined : selectedStatus;
      const needsData = await needAPI.getUserNeeds(status);
      setNeeds(needsData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'İhtiyaçlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, selectedStatus]);

  useEffect(() => {
    loadMyNeeds();
  }, [loadMyNeeds]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadMyNeeds();
    }, [loadMyNeeds])
  );

  const handleNeedPress = (needId: number) => {
    navigation.navigate('NeedDetail', { needId });
  };

  const handleCreateNeed = () => {
    if (user?.isGuest) {
      Alert.alert(
        'Giriş Gerekli',
        'İhtiyaç oluşturmak için giriş yapmanız gerekiyor.',
        [{ text: 'Tamam' }]
      );
      return;
    }
    navigation.navigate('CreateNeed');
  };

  const handleEditNeed = (needId: number) => {
    // Navigate to edit screen (will be implemented later)
    Alert.alert('Bilgi', 'İhtiyaç düzenleme özelliği yakında eklenecek.');
  };

  const handleDeleteNeed = (needId: number, title: string) => {
    Alert.alert(
      'İhtiyacı Sil',
      `"${title}" başlıklı ihtiyacınızı silmek istediğinizden emin misiniz?`,
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await needAPI.deleteNeed(needId);
              Alert.alert('Başarılı', 'İhtiyaç başarıyla silindi!');
              loadMyNeeds(); // Refresh list
            } catch (err: any) {
              Alert.alert('Hata', err.response?.data?.message || 'İhtiyaç silinirken hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleReviewProvider = async (needId: number) => {
    try {
      // Get the accepted offer for this need to find the provider
      const offers = await offerAPI.getOffersForNeed(needId);
      const acceptedOffer = offers.find(offer => offer.status === 'Accepted');
      
      if (!acceptedOffer || !acceptedOffer.provider) {
        Alert.alert('Hata', 'Bu ihtiyaç için kabul edilmiş teklif bulunamadı.');
        return;
      }

      navigation.navigate('Review', {
        revieweeId: acceptedOffer.providerId,
        revieweeName: `${acceptedOffer.provider.firstName} ${acceptedOffer.provider.lastName}`,
        offerId: acceptedOffer.id,
        mode: 'create',
      });
    } catch (err: any) {
      console.error('Error getting offer for review:', err);
      Alert.alert('Hata', 'Değerlendirme sayfası açılırken hata oluştu.');
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Active':
        return 'Aktif';
      case 'InProgress':
        return 'Devam Ediyor';
      case 'Completed':
        return 'Tamamlandı';
      case 'Cancelled':
        return 'İptal Edildi';
      case 'Expired':
        return 'Süresi Doldu';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return colors.success;
      case 'InProgress':
        return colors.warning;
      case 'Completed':
        return colors.primary;
      case 'Cancelled':
      case 'Expired':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Urgent':
        return colors.urgent;
      case 'Normal':
        return colors.normal;
      case 'Flexible':
        return colors.flexible;
      default:
        return colors.textSecondary;
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'Urgent':
        return 'Acil';
      case 'Normal':
        return 'Normal';
      case 'Flexible':
        return 'Esnek';
      default:
        return urgency;
    }
  };

  const formatBudget = (minBudget?: number, maxBudget?: number, currency = 'TRY') => {
    if (!minBudget && !maxBudget) return 'Bütçe belirtilmemiş';
    if (minBudget && maxBudget) {
      return `${minBudget.toLocaleString()} - ${maxBudget.toLocaleString()} ${currency}`;
    }
    if (minBudget) {
      return `${minBudget.toLocaleString()} ${currency} ve üzeri`;
    }
    if (maxBudget) {
      return `${maxBudget.toLocaleString()} ${currency} ve altı`;
    }
    return '';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Az önce';
    if (diffInHours < 24) return `${diffInHours} saat önce`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR');
  };

  const getFilteredNeeds = () => {
    if (selectedStatus === 'All') return needs;
    return needs.filter(need => need.status === selectedStatus);
  };

  const getStatusCount = (status: NeedStatus) => {
    if (status === 'All') return needs.length;
    return needs.filter(need => need.status === status).length;
  };

  const renderStatusFilter = () => (
    <View style={styles.filterContainer}>
      <FlatList
        data={statusOptions}
        renderItem={({ item }) => {
          const count = getStatusCount(item.key);
          const isSelected = selectedStatus === item.key;
          
          return (
            <TouchableOpacity
              style={[
                styles.filterButton,
                isSelected && styles.filterButtonSelected,
              ]}
              onPress={() => setSelectedStatus(item.key)}
            >
              <Text style={[
                styles.filterButtonText,
                isSelected && styles.filterButtonTextSelected,
              ]}>
                {item.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
      />
    </View>
  );

  const renderNeedItem = ({ item }: { item: Need }) => (
    <TouchableOpacity onPress={() => handleNeedPress(item.id)}>
      <Card style={styles.needCard}>
        <View style={styles.needHeader}>
          <View style={styles.needTitleContainer}>
            <Text style={styles.needTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.badgeContainer}>
              <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgency) }]}>
                <Text style={styles.urgencyText}>
                  {getUrgencyText(item.urgency)}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>
                  {getStatusText(item.status)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.needDescription} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.needMeta}>
          <View style={styles.metaRow}>
            <MaterialIcons name="category" size={16} color={colors.textSecondary} />
            <Text style={styles.metaText}>
              {item.category?.nameTr || 'Kategori'}
            </Text>
          </View>

          {(item.minBudget || item.maxBudget) && (
            <View style={styles.metaRow}>
              <MaterialIcons name="attach-money" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>
                {formatBudget(item.minBudget, item.maxBudget, item.currency)}
              </Text>
            </View>
          )}

          {item.address && (
            <View style={styles.metaRow}>
              <MaterialIcons name="location-on" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.needFooter}>
          <View style={styles.timeAndOffers}>
            <Text style={styles.timeText}>
              {formatDate(item.createdAt)}
            </Text>
            {item.offerCount !== undefined && item.offerCount > 0 && (
              <View style={styles.offerBadge}>
                <MaterialIcons name="local-offer" size={12} color={colors.primary} />
                <Text style={styles.offerCount}>
                  {item.offerCount} teklif
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            {item.status === 'Active' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleEditNeed(item.id)}
              >
                <MaterialIcons name="edit" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
            
            {item.status === 'Completed' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleReviewProvider(item.id)}
              >
                <MaterialIcons name="star" size={16} color={colors.warning} />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteNeed(item.id, item.title)}
            >
              <MaterialIcons name="delete" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="list-alt" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>
        {selectedStatus === 'All' ? 'Henüz ihtiyaç yok' : `${statusOptions.find(s => s.key === selectedStatus)?.label} ihtiyaç yok`}
      </Text>
      <Text style={styles.emptyDescription}>
        {selectedStatus === 'All' 
          ? 'İlk ihtiyacınızı oluşturmak için aşağıdaki butona tıklayın.'
          : 'Bu durumda hiç ihtiyacınız bulunmuyor.'
        }
      </Text>
      {selectedStatus === 'All' && (
        <Button
          title="İhtiyaç Oluştur"
          onPress={handleCreateNeed}
          icon="add"
          style={styles.emptyActionButton}
        />
      )}
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>İhtiyaçlarım</Text>
        </View>
        <ErrorMessage 
          message="Bu sayfayı görüntülemek için giriş yapmanız gerekiyor." 
        />
      </SafeAreaView>
    );
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>İhtiyaçlarım</Text>
        </View>
        <Loading text="İhtiyaçlarınız yükleniyor..." />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>İhtiyaçlarım</Text>
        </View>
        <ErrorMessage 
          message={error} 
          onRetry={() => loadMyNeeds()} 
          showRetry 
        />
      </SafeAreaView>
    );
  }

  const filteredNeeds = getFilteredNeeds();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>İhtiyaçlarım</Text>
        <TouchableOpacity
          onPress={handleCreateNeed}
          style={styles.headerButton}
        >
          <MaterialIcons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {renderStatusFilter()}

      <FlatList
        data={filteredNeeds}
        renderItem={renderNeedItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadMyNeeds(true)}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
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
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight as any,
    color: colors.text,
  },
  headerButton: {
    padding: spacing.sm,
  },
  filterContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  filterButtonTextSelected: {
    color: colors.surface,
  },
  listContainer: {
    padding: spacing.lg,
  },
  needCard: {
    marginBottom: spacing.lg,
  },
  needHeader: {
    marginBottom: spacing.md,
  },
  needTitleContainer: {
    marginBottom: spacing.md,
  },
  needTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  urgencyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.surface,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.surface,
  },
  needDescription: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  needMeta: {
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metaText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
  },
  needFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timeAndOffers: {
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  offerCount: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: 6,
    backgroundColor: colors.background,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  emptyActionButton: {
    minWidth: 200,
  },
});

export default MyNeedsScreen;