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
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { needAPI, categoryAPI } from '../services/api';
import { optimizedApiService } from '../services/optimizedApiService';
import { Need, Category, NeedFilters } from '../types';
import NeedCard from '../src/components/NeedCard';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import ErrorMessage from '../components/ui/ErrorMessage';
import Header from '../components/ui/Header';
import AuthPromptModal from '../components/ui/AuthPromptModal';
import ConversionBanner from '../components/ui/ConversionBanner';
import GuestWelcomeCard from '../components/ui/GuestWelcomeCard';
import FilterModal from '../components/ui/FilterModal';
import { VirtualizedList } from '../components/ui/VirtualizedList';
import { colors, spacing, typography } from '../theme';
import { RootStackParamList } from '../types';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { useAuthPrompt } from '../hooks/useAuthPrompt';
import { useConversionPrompts } from '../hooks/useConversionPrompts';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user, trackGuestAction } = useAuth();
  const { measureOperation } = usePerformanceMonitor('HomeScreen');
  const { 
    requireAuthForGuest, 
    modalVisible, 
    modalContext, 
    handleLogin, 
    handleRegister, 
    handleDismiss 
  } = useAuthPrompt();
  
  const {
    showSoftPrompt,
    showScrollPrompt,
    viewCount,
    handleAuthAction,
    handleDismissPrompt,
    trackScrollAction,
    isGuest
  } = useConversionPrompts();
  
  const [needs, setNeeds] = useState<Need[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<NeedFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showWelcomeCard, setShowWelcomeCard] = useState(true);

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
          : await optimizedApiService.get('/need', {
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
        const items = Array.isArray(needsData) ? needsData : ((needsData as any)?.items || []);
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
        const categoriesData = await optimizedApiService.get('/category', {}, { 
          cache: true, 
          cacheTime: 30 * 60 * 1000 // 30 minutes cache
        });
        setCategories(categoriesData as Category[]);
      } catch (err) {
        console.error('Kategoriler yüklenirken hata:', err);
      }
    });
  }, [measureOperation]);

  useEffect(() => {
    loadNeeds();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const handleSearch = () => {
    loadNeeds();
  };

  const handleNeedPress = (needId: number) => {
    // Track guest action for viewing needs
    if (user?.isGuest) {
      trackGuestAction({
        type: 'view_need',
        needId,
        context: { source: 'home_list' }
      });
    }
    navigation.navigate('NeedDetail', { needId });
  };

  const handleCreateNeed = () => {
    requireAuthForGuest('create_need', () => {
      navigation.navigate('CreateNeed');
    });
  };

  const handleSearchPress = () => {
    navigation.navigate('Search');
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
    <NeedCard need={item} onPress={handleNeedPress} />
  );

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categoryId) count++;
    if (filters.minBudget || filters.maxBudget) count++;
    if (filters.radius) count++;
    if (filters.urgency) count++;
    return count;
  };

  const renderFilterButton = () => {
    const activeCount = getActiveFilterCount();

    return (
      <TouchableOpacity
        onPress={() => setShowFilters(!showFilters)}
        style={styles.filterButton}
        accessibilityRole="button"
        accessibilityLabel={activeCount > 0 ? `Filtreler (${activeCount} aktif filtre)` : 'Filtreler'}
        accessibilityHint="Filtreleme seçeneklerini açmak için dokunun"
      >
        <MaterialIcons name="filter-list" size={24} color={colors.primaryDark} />
        {activeCount > 0 && (
          <View style={styles.filterBadge} accessible={false}>
            <Text style={styles.filterBadgeText} accessible={false}>{activeCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderAuthButton = () => {
    if (user?.isGuest) {
      return (
        <TouchableOpacity
          onPress={() => requireAuthForGuest('view_profile', () => {})}
          style={styles.authButton}
          accessibilityRole="button"
          accessibilityLabel="Giriş Yap"
          accessibilityHint="Giriş yapmak veya kayıt olmak için dokunun"
        >
          <MaterialIcons name="login" size={24} color={colors.primaryDark} />
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile' as never)}
          style={styles.authButton}
          accessibilityRole="button"
          accessibilityLabel="Profil"
          accessibilityHint="Profil sayfanıza gitmek için dokunun"
        >
          <MaterialIcons name="account-circle" size={24} color={colors.primaryDark} />
        </TouchableOpacity>
      );
    }
  };

  const renderHeaderRightComponent = () => (
    <View style={styles.headerRightContainer}>
      {renderFilterButton()}
      {renderAuthButton()}
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <MaterialIcons name="search" size={20} color={colors.secondaryOrange} />
        <TextInput
          style={styles.searchInput}
          placeholder="İhtiyaç ara..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          accessibilityLabel="İhtiyaç ara"
          accessibilityHint="Aramak istediğiniz ihtiyacı yazın"
          allowFontScaling={true}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Aramayı temizle"
            accessibilityHint="Arama kutusundaki metni silmek için dokunun"
          >
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
      <View style={styles.emptyIllustration}>
        <LinearGradient
          colors={[colors.primaryLight, colors.secondaryOrangeLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyCircle}
        >
          <MaterialIcons
            name={searchQuery ? "search-off" : "inventory-2"}
            size={80}
            color={colors.primary}
          />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle} allowFontScaling={true}>
        {searchQuery ? 'Sonuç Bulunamadı' : 'Henüz İhtiyaç Yok'}
      </Text>
      <Text style={styles.emptyDescription} allowFontScaling={true}>
        {searchQuery
          ? 'Arama kriterlerinizi değiştirerek tekrar deneyin.'
          : 'İlk ihtiyacı siz paylaşın ve teklifler almaya başlayın!'}
      </Text>
      {!searchQuery && (
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyButton}
        >
          <TouchableOpacity
            onPress={handleCreateNeed}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="İhtiyaç oluştur"
            accessibilityHint="İlk ihtiyacınızı paylaşmak için dokunun"
            style={styles.emptyButtonInner}
          >
            <MaterialIcons name="add-circle" size={20} color={colors.onPrimary} />
            <Text style={styles.emptyButtonText} allowFontScaling={true} accessible={false}>İhtiyaç Oluştur</Text>
          </TouchableOpacity>
        </LinearGradient>
      )}
    </View>
  );

  const renderGuestContent = () => {
    if (!isGuest) return null;
    
    return (
      <View>
        {/* Welcome card for new guests */}
        {showWelcomeCard && viewCount === 0 && (
          <GuestWelcomeCard
            onGetStarted={() => {
              setShowWelcomeCard(false);
              handleAuthAction();
            }}
          />
        )}
        
        {/* Conversion prompts */}
        {showSoftPrompt && (
          <ConversionBanner
            type="soft_prompt"
            viewCount={viewCount}
            onAuthAction={handleAuthAction}
            onDismiss={() => handleDismissPrompt('soft')}
          />
        )}
        
        {showScrollPrompt && (
          <ConversionBanner
            type="scroll_prompt"
            onAuthAction={handleAuthAction}
            onDismiss={() => handleDismissPrompt('scroll')}
          />
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <Header
          title="İhtiyaçlar"
          showSearch
          onSearchPress={handleSearchPress}
          rightComponent={renderHeaderRightComponent()}
        />
        <Loading text="İhtiyaçlar yükleniyor..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header
          title="İhtiyaçlar"
          showSearch
          onSearchPress={handleSearchPress}
          rightComponent={renderHeaderRightComponent()}
        />
        <ErrorMessage
          message={error}
          onRetry={() => loadNeeds()}
          showRetry
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="İhtiyaçlar"
        showSearch
        onSearchPress={handleSearchPress}
        rightComponent={renderHeaderRightComponent()}
      />
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
        ListHeaderComponent={renderGuestContent}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={120}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        onScroll={() => trackScrollAction()}
        scrollEventThrottle={1000}
      />

      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fab}
      >
        <TouchableOpacity
          onPress={handleCreateNeed}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Yeni ihtiyaç oluştur"
          accessibilityHint="Yeni bir ihtiyaç ilanı eklemek için dokunun"
          style={styles.fabInner}
        >
          <MaterialIcons name="add" size={24} color={colors.onPrimary} />
        </TouchableOpacity>
      </LinearGradient>

      <AuthPromptModal
        visible={modalVisible}
        context={modalContext}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onDismiss={handleDismiss}
      />

      <FilterModal
        visible={showFilters}
        filters={filters}
        categories={categories}
        onApply={(newFilters) => {
          setFilters(newFilters);
          loadNeeds();
        }}
        onClear={() => {
          setFilters({});
          loadNeeds();
        }}
        onClose={() => setShowFilters(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    padding: spacing.sm,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.secondaryOrangeDark,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: colors.onOrangeDark,
    fontSize: 11,
    fontWeight: 'bold',
  },
  authButton: {
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
    backgroundColor: colors.secondaryOrangeDark,
  },
  listContainer: {
    padding: spacing.lg,
    paddingBottom: 80, // Space for FAB
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 60,
  },
  emptyIllustration: {
    marginBottom: spacing.xl,
  },
  emptyCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  emptyButton: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;
