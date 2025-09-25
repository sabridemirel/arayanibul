import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { needAPI, categoryAPI } from '../services/api';
import { optimizedApiService } from '../services/optimizedApiService';
import { Need, Category, NeedFilters } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import ErrorMessage from '../components/ui/ErrorMessage';
import { VirtualizedList } from '../components/ui/VirtualizedList';
import { LazyImage } from '../components/ui/LazyImage';
import { colors, spacing, typography } from '../theme';
import { RootStackParamList } from '../types';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  const { measureOperation } = usePerformanceMonitor('HomeScreen');
  
  const [needs, setNeeds] = useState<Need[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<NeedFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const loadNeeds = useCallback(async (refresh = false) => {
    await measureOperation('loadNeeds', async () => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const searchFilters: NeedFilters = {
          ...filters,
          search: searchQuery || undefined,
        };

        // Use optimized API service with caching for non-refresh requests
        const needsData = refresh 
          ? await needAPI.getNeeds(searchFilters)
          : await optimizedApiService.get('/api/need', {
              categoryId: searchFilters.categoryId,
              minBudget: searchFilters.minBudget,
              maxBudget: searchFilters.maxBudget,
              latitude: searchFilters.latitude,
              longitude: searchFilters.longitude,
              radiusKm: searchFilters.radius,
              urgency: searchFilters.urgency,
              searchText: searchFilters.search,
              page: searchFilters.page,
              pageSize: searchFilters.pageSize,
            }, { 
              cache: true, 
              cacheTime: 2 * 60 * 1000 // 2 minutes cache
            });
        const items = Array.isArray(needsData) ? needsData : (needsData?.items || []);
        setNeeds(items);
      } catch (err: any) {
        setError(err.response?.data?.message || 'İhtiyaçlar yüklenirken hata oluştu');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    });
  }, [filters, searchQuery, measureOperation]);

  const loadCategories = useCallback(async () => {
    await measureOperation('loadCategories', async () => {
      try {
        // Use optimized API service with longer cache for categories
        const categoriesData = await optimizedApiService.get('/api/category', {}, { 
          cache: true, 
          cacheTime: 30 * 60 * 1000 // 30 minutes cache
        });
        setCategories(categoriesData);
      } catch (err) {
        console.error('Kategoriler yüklenirken hata:', err);
      }
    });
  }, [measureOperation]);

  useEffect(() => {
    loadNeeds();
    loadCategories();
  }, [loadNeeds, loadCategories]);

  const handleSearch = () => {
    loadNeeds();
  };

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

  const renderNeedItem = ({ item }: { item: Need }) => (
    <TouchableOpacity onPress={() => handleNeedPress(item.id)}>
      <Card style={styles.needCard}>
        <View style={styles.needHeader}>
          <View style={styles.needTitleContainer}>
            <Text style={styles.needTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(item.urgency) }]}>
              <Text style={styles.urgencyText}>
                {getUrgencyText(item.urgency)}
              </Text>
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
          <View style={styles.userInfo}>
            <MaterialIcons name="person" size={16} color={colors.textSecondary} />
            <Text style={styles.userName}>
              {item.user?.firstName} {item.user?.lastName}
            </Text>
          </View>
          
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
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>İhtiyaçlar</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity 
          onPress={() => setShowFilters(!showFilters)}
          style={styles.filterButton}
        >
          <MaterialIcons name="filter-list" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <MaterialIcons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="İhtiyaç ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="clear" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      <Button
        title="Ara"
        onPress={handleSearch}
        size="small"
        style={styles.searchButton}
      />
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="search-off" size={64} color={colors.textSecondary} />
      <Text style={styles.emptyTitle}>İhtiyaç bulunamadı</Text>
      <Text style={styles.emptyDescription}>
        {searchQuery ? 'Arama kriterlerinize uygun ihtiyaç bulunamadı.' : 'Henüz hiç ihtiyaç paylaşılmamış.'}
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <Loading text="İhtiyaçlar yükleniyor..." />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <ErrorMessage 
          message={error} 
          onRetry={() => loadNeeds()} 
          showRetry 
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderSearchBar()}
      
      <VirtualizedList
        data={needs}
        renderItem={renderNeedItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNeeds(true)}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={120}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateNeed}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={24} color={colors.surface} />
      </TouchableOpacity>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    padding: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body.fontSize,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  searchButton: {
    minWidth: 60,
  },
  listContainer: {
    padding: spacing.lg,
    paddingBottom: 80, // Space for FAB
  },
  needCard: {
    marginBottom: spacing.lg,
  },
  needHeader: {
    marginBottom: spacing.md,
  },
  needTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  needTitle: {
    flex: 1,
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
    marginRight: spacing.md,
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  timeAndOffers: {
    alignItems: 'flex-end',
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
  },
  offerCount: {
    fontSize: 12,
    color: colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
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
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});

export default HomeScreen;
