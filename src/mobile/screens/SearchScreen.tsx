import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  TextInput,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { needAPI, categoryAPI, searchAPI } from '../services/api';
import { Need, Category, NeedFilters } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Loading from '../components/ui/Loading';
import ErrorMessage from '../components/ui/ErrorMessage';
import { colors, spacing, typography } from '../theme';
import { RootStackParamList } from '../types';

type SearchScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface SearchHistory {
  id: string;
  query: string;
  timestamp: number;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: NeedFilters;
  onApplyFilters: (filters: NeedFilters) => void;
  categories: Category[];
}

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY_ITEMS = 10;

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { user } = useAuth();
  
  const [needs, setNeeds] = useState<Need[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<NeedFilters>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recommendations, setRecommendations] = useState<Need[]>([]);
  const [popularNeeds, setPopularNeeds] = useState<Need[]>([]);
  const [trendingNeeds, setTrendingNeeds] = useState<Need[]>([]);
  const [nearbyNeeds, setNearbyNeeds] = useState<Need[]>([]);
  const [loadingDiscovery, setLoadingDiscovery] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const categoriesData = await categoryAPI.getCategories();
      setCategories(categoriesData);
    } catch (err) {
      console.error('Kategoriler yüklenirken hata:', err);
    }
  }, []);

  const loadSearchHistory = useCallback(async () => {
    try {
      const historyJson = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (historyJson) {
        const history: SearchHistory[] = JSON.parse(historyJson);
        setSearchHistory(history.sort((a, b) => b.timestamp - a.timestamp));
      }
    } catch (err) {
      console.error('Arama geçmişi yüklenirken hata:', err);
    }
  }, []);

  const loadDiscoveryData = useCallback(async () => {
    try {
      setLoadingDiscovery(true);
      
      // Try to get comprehensive discovery data
      const discoverData = await searchAPI.getDiscoverRecommendations(
        userLocation?.lat, 
        userLocation?.lng
      ).catch(() => null);
      
      if (discoverData) {
        setPopularNeeds(discoverData.popular?.needs || []);
        setTrendingNeeds(discoverData.trending || []);
        setNearbyNeeds(discoverData.nearby?.needs || []);
        setRecommendations(discoverData.forYou || []);
      } else {
        // Fallback to individual API calls
        const [recommendationsData, popularNeedsData, trendingNeedsData] = await Promise.all([
          searchAPI.getRecommendations().catch(() => []),
          searchAPI.getPopularNeeds().catch(() => []),
          searchAPI.getTrendingNeeds().catch(() => [])
        ]);
        
        setRecommendations(recommendationsData);
        setPopularNeeds(popularNeedsData);
        setTrendingNeeds(trendingNeedsData);
        
        // Load nearby if location is available
        if (userLocation) {
          const nearbyData = await searchAPI.getLocationBasedRecommendations(
            userLocation.lat, 
            userLocation.lng
          ).catch(() => []);
          setNearbyNeeds(nearbyData);
        }
      }
    } catch (err) {
      console.error('Keşif verileri yüklenirken hata:', err);
    } finally {
      setLoadingDiscovery(false);
    }
  }, [userLocation]);

  const saveSearchToHistory = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    try {
      const newHistoryItem: SearchHistory = {
        id: Date.now().toString(),
        query: query.trim(),
        timestamp: Date.now(),
      };

      const updatedHistory = [
        newHistoryItem,
        ...searchHistory.filter(item => item.query !== query.trim())
      ].slice(0, MAX_HISTORY_ITEMS);

      setSearchHistory(updatedHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (err) {
      console.error('Arama geçmişi kaydedilirken hata:', err);
    }
  }, [searchHistory]);

  const clearSearchHistory = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
      setSearchHistory([]);
    } catch (err) {
      console.error('Arama geçmişi temizlenirken hata:', err);
    }
  }, []);

  const requestLocationPermission = useCallback(async () => {
    try {
      // Mock location permission and coordinates
      const userLoc = {
        lat: 41.0082, // Istanbul coordinates as default
        lng: 28.9784
      };
      setUserLocation(userLoc);
      return userLoc;
    } catch (err) {
      console.error('Konum alınırken hata:', err);
      Alert.alert(
        'Konum İzni',
        'Yakındaki ihtiyaçları görmek için konum izni gereklidir.',
        [{ text: 'Tamam' }]
      );
      return null;
    }
  }, []);

  const performSearch = useCallback(async (query: string, searchFilters: NeedFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      const searchResults = await searchAPI.search(query, searchFilters);
      setNeeds(searchResults);
      
      if (query.trim()) {
        await saveSearchToHistory(query);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Arama yapılırken hata oluştu');
    } finally {
      setLoading(false);
      setShowSuggestions(false);
    }
  }, [saveSearchToHistory]);

  const handleSearch = useCallback(() => {
    performSearch(searchQuery, filters);
  }, [performSearch, searchQuery, filters]);

  const handleHistoryItemPress = useCallback((query: string) => {
    setSearchQuery(query);
    performSearch(query, filters);
  }, [performSearch, filters]);

  const handleNeedPress = (needId: number) => {
    navigation.navigate('NeedDetail', { needId });
  };

  const handleApplyFilters = (newFilters: NeedFilters) => {
    setFilters(newFilters);
    setShowFilterModal(false);
    if (hasSearched) {
      performSearch(searchQuery, newFilters);
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categoryId) count++;
    if (filters.minBudget || filters.maxBudget) count++;
    if (filters.latitude && filters.longitude && filters.radius) count++;
    if (filters.urgency) count++;
    return count;
  };

  useEffect(() => {
    loadCategories();
    loadSearchHistory();
    loadDiscoveryData();
  }, [loadCategories, loadSearchHistory, loadDiscoveryData]);

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
          onFocus={() => setShowSuggestions(true)}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="clear" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity
        style={[styles.filterButton, getActiveFilterCount() > 0 && styles.filterButtonActive]}
        onPress={() => setShowFilterModal(true)}
      >
        <MaterialIcons 
          name="tune" 
          size={20} 
          color={getActiveFilterCount() > 0 ? colors.surface : colors.primary} 
        />
        {getActiveFilterCount() > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSearchSuggestions = () => {
    if (!showSuggestions || searchHistory.length === 0) return null;

    return (
      <Card style={styles.suggestionsContainer}>
        <View style={styles.suggestionsHeader}>
          <Text style={styles.suggestionsTitle}>Son Aramalar</Text>
          <TouchableOpacity onPress={clearSearchHistory}>
            <Text style={styles.clearHistoryText}>Temizle</Text>
          </TouchableOpacity>
        </View>
        
        {searchHistory.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.suggestionItem}
            onPress={() => handleHistoryItemPress(item.query)}
          >
            <MaterialIcons name="history" size={16} color={colors.textSecondary} />
            <Text style={styles.suggestionText}>{item.query}</Text>
          </TouchableOpacity>
        ))}
      </Card>
    );
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

  const renderDiscoverySection = () => {
    if (hasSearched) return null;

    return (
      <ScrollView style={styles.discoveryContainer} showsVerticalScrollIndicator={false}>
        {/* Recommendations Section */}
        {user && !user.isGuest && recommendations.length > 0 && (
          <View style={styles.discoverySection}>
            <View style={styles.discoverySectionHeader}>
              <MaterialIcons name="recommend" size={24} color={colors.primary} />
              <Text style={styles.discoverySectionTitle}>Size Özel Öneriler</Text>
            </View>
            <Text style={styles.discoverySectionSubtitle}>
              Geçmiş aktivitelerinize göre önerilen ihtiyaçlar
            </Text>
            <FlatList
              data={recommendations.slice(0, 5)}
              renderItem={renderNeedItem}
              keyExtractor={(item) => `rec-${item.id}`}
              scrollEnabled={false}
            />
            {recommendations.length > 5 && (
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => {
                  setSearchQuery('');
                  performSearch('', { /* recommendations filter */ });
                }}
              >
                <Text style={styles.seeAllText}>Tümünü Gör ({recommendations.length})</Text>
                <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Trending Needs Section */}
        {trendingNeeds.length > 0 && (
          <View style={styles.discoverySection}>
            <View style={styles.discoverySectionHeader}>
              <MaterialIcons name="trending-up" size={24} color={colors.warning} />
              <Text style={styles.discoverySectionTitle}>Trend İhtiyaçlar</Text>
            </View>
            <Text style={styles.discoverySectionSubtitle}>
              Hızla popülerleşen ihtiyaçlar
            </Text>
            <FlatList
              data={trendingNeeds.slice(0, 3)}
              renderItem={renderNeedItem}
              keyExtractor={(item) => `trend-${item.id}`}
              scrollEnabled={false}
            />
            {trendingNeeds.length > 3 && (
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => {
                  setSearchQuery('');
                  performSearch('', {});
                }}
              >
                <Text style={styles.seeAllText}>Tümünü Gör ({trendingNeeds.length})</Text>
                <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Popular Needs Section */}
        {popularNeeds.length > 0 && (
          <View style={styles.discoverySection}>
            <View style={styles.discoverySectionHeader}>
              <MaterialIcons name="star" size={24} color={colors.success} />
              <Text style={styles.discoverySectionTitle}>Popüler İhtiyaçlar</Text>
            </View>
            <Text style={styles.discoverySectionSubtitle}>
              En çok teklif alan ihtiyaçlar
            </Text>
            <FlatList
              data={popularNeeds.slice(0, 3)}
              renderItem={renderNeedItem}
              keyExtractor={(item) => `pop-${item.id}`}
              scrollEnabled={false}
            />
            {popularNeeds.length > 3 && (
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => {
                  setSearchQuery('');
                  performSearch('', {});
                }}
              >
                <Text style={styles.seeAllText}>Tümünü Gör ({popularNeeds.length})</Text>
                <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Location-based Suggestions */}
        <View style={styles.discoverySection}>
          <View style={styles.discoverySectionHeader}>
            <MaterialIcons name="location-on" size={24} color={colors.info} />
            <Text style={styles.discoverySectionTitle}>Yakınınızda</Text>
          </View>
          <Text style={styles.discoverySectionSubtitle}>
            Konumunuza yakın ihtiyaçları keşfedin
          </Text>
          
          {nearbyNeeds.length > 0 ? (
            <>
              <FlatList
                data={nearbyNeeds.slice(0, 3)}
                renderItem={renderNeedItem}
                keyExtractor={(item) => `nearby-${item.id}`}
                scrollEnabled={false}
              />
              {nearbyNeeds.length > 3 && (
                <TouchableOpacity 
                  style={styles.seeAllButton}
                  onPress={() => {
                    setFilters({ ...filters, radius: 25 });
                    performSearch('', { ...filters, radius: 25 });
                  }}
                >
                  <Text style={styles.seeAllText}>Tümünü Gör ({nearbyNeeds.length})</Text>
                  <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity 
              style={styles.locationButton}
              onPress={async () => {
                const location = await requestLocationPermission();
                if (location) {
                  try {
                    const nearbyData = await searchAPI.getLocationBasedRecommendations(
                      location.lat, 
                      location.lng, 
                      25
                    );
                    setNearbyNeeds(nearbyData);
                  } catch (err) {
                    console.error('Yakındaki ihtiyaçlar yüklenirken hata:', err);
                  }
                }
              }}
            >
              <MaterialIcons name="my-location" size={20} color={colors.primary} />
              <Text style={styles.locationButtonText}>Yakındaki İhtiyaçları Göster</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Categories */}
        <View style={styles.discoverySection}>
          <View style={styles.discoverySectionHeader}>
            <MaterialIcons name="category" size={24} color={colors.secondary} />
            <Text style={styles.discoverySectionTitle}>Kategoriler</Text>
          </View>
          <Text style={styles.discoverySectionSubtitle}>
            Popüler kategorilerde arama yapın
          </Text>
          <View style={styles.quickCategories}>
            {categories.slice(0, 6).map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.quickCategoryItem}
                onPress={() => {
                  setFilters({ ...filters, categoryId: category.id });
                  performSearch('', { ...filters, categoryId: category.id });
                }}
              >
                <View style={styles.quickCategoryIcon}>
                  <MaterialIcons name="category" size={24} color={colors.primary} />
                </View>
                <Text style={styles.quickCategoryText}>{category.nameTr}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Search Tips */}
        <View style={styles.discoverySection}>
          <View style={styles.discoverySectionHeader}>
            <MaterialIcons name="lightbulb" size={24} color={colors.info} />
            <Text style={styles.discoverySectionTitle}>Arama İpuçları</Text>
          </View>
          <View style={styles.searchTips}>
            <View style={styles.searchTip}>
              <MaterialIcons name="search" size={16} color={colors.textSecondary} />
              <Text style={styles.searchTipText}>Spesifik kelimeler kullanın: "iPhone 13" yerine "telefon"</Text>
            </View>
            <View style={styles.searchTip}>
              <MaterialIcons name="tune" size={16} color={colors.textSecondary} />
              <Text style={styles.searchTipText}>Filtreleri kullanarak sonuçları daraltın</Text>
            </View>
            <View style={styles.searchTip}>
              <MaterialIcons name="location-on" size={16} color={colors.textSecondary} />
              <Text style={styles.searchTipText}>Konum filtresini aktif ederek yakındaki ihtiyaçları bulun</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="search-off" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
        <Text style={styles.emptyDescription}>
          Arama kriterlerinize uygun ihtiyaç bulunamadı. Farklı kelimeler deneyin veya filtreleri değiştirin.
        </Text>
      </View>
    );
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Arama</Text>
      </View>

      {renderSearchBar()}
      
      {showSuggestions && renderSearchSuggestions()}

      {loading ? (
        <Loading text="Aranıyor..." />
      ) : error ? (
        <ErrorMessage 
          message={error} 
          onRetry={handleSearch} 
          showRetry 
        />
      ) : !hasSearched ? (
        loadingDiscovery ? (
          <Loading text="Keşif verileri yükleniyor..." />
        ) : (
          renderDiscoverySection()
        )
      ) : (
        <FlatList
          data={needs}
          renderItem={renderNeedItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleSearch}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        categories={categories}
      />
    </SafeAreaView>
  );
};
const
 FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApplyFilters,
  categories,
}) => {
  const [localFilters, setLocalFilters] = useState<NeedFilters>(filters);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    categories.find(cat => cat.id === filters.categoryId) || null
  );

  useEffect(() => {
    setLocalFilters(filters);
    setSelectedCategory(categories.find(cat => cat.id === filters.categoryId) || null);
  }, [filters, categories]);

  const handleApply = () => {
    onApplyFilters(localFilters);
  };

  const handleReset = () => {
    setLocalFilters({});
    setSelectedCategory(null);
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setLocalFilters({ ...localFilters, categoryId: category.id });
  };

  const handleUrgencySelect = (urgency: string) => {
    setLocalFilters({ 
      ...localFilters, 
      urgency: localFilters.urgency === urgency ? undefined : urgency 
    });
  };

  const urgencyOptions = [
    { value: 'Urgent', label: 'Acil', color: colors.urgent },
    { value: 'Normal', label: 'Normal', color: colors.normal },
    { value: 'Flexible', label: 'Esnek', color: colors.flexible },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Filtreler</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.resetText}>Sıfırla</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Category Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Kategori</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryList}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory?.id === category.id && styles.categoryChipSelected
                    ]}
                    onPress={() => handleCategorySelect(category)}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      selectedCategory?.id === category.id && styles.categoryChipTextSelected
                    ]}>
                      {category.nameTr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Budget Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Bütçe Aralığı</Text>
            <View style={styles.budgetInputs}>
              <Input
                placeholder="Min. tutar"
                value={localFilters.minBudget?.toString() || ''}
                onChangeText={(text) => setLocalFilters({
                  ...localFilters,
                  minBudget: text ? parseInt(text) : undefined
                })}
                keyboardType="numeric"
                containerStyle={styles.budgetInput}
              />
              <Text style={styles.budgetSeparator}>-</Text>
              <Input
                placeholder="Max. tutar"
                value={localFilters.maxBudget?.toString() || ''}
                onChangeText={(text) => setLocalFilters({
                  ...localFilters,
                  maxBudget: text ? parseInt(text) : undefined
                })}
                keyboardType="numeric"
                containerStyle={styles.budgetInput}
              />
            </View>
          </View>

          {/* Urgency Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Aciliyet Durumu</Text>
            <View style={styles.urgencyList}>
              {urgencyOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.urgencyChip,
                    localFilters.urgency === option.value && {
                      backgroundColor: option.color,
                      borderColor: option.color,
                    }
                  ]}
                  onPress={() => handleUrgencySelect(option.value)}
                >
                  <Text style={[
                    styles.urgencyChipText,
                    localFilters.urgency === option.value && styles.urgencyChipTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Konum ve Mesafe</Text>
            <Text style={styles.filterSectionSubtitle}>
              Yakınınızdaki ihtiyaçları görmek için konum izni verin
            </Text>
            <View style={styles.radiusOptions}>
              {[5, 10, 25, 50].map((radius) => (
                <TouchableOpacity
                  key={radius}
                  style={[
                    styles.radiusChip,
                    localFilters.radius === radius && styles.radiusChipSelected
                  ]}
                  onPress={() => setLocalFilters({
                    ...localFilters,
                    radius: localFilters.radius === radius ? undefined : radius
                  })}
                >
                  <Text style={[
                    styles.radiusChipText,
                    localFilters.radius === radius && styles.radiusChipTextSelected
                  ]}>
                    {radius} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            title="Filtreleri Uygula"
            onPress={handleApply}
            fullWidth
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
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
  filterButton: {
    position: 'relative',
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionsContainer: {
    margin: spacing.lg,
    marginBottom: 0,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  clearHistoryText: {
    fontSize: 14,
    color: colors.primary,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
  },
  resetText: {
    fontSize: 16,
    color: colors.primary,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  filterSection: {
    marginVertical: spacing.lg,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  filterSectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  categoryList: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.text,
  },
  categoryChipTextSelected: {
    color: colors.surface,
  },
  budgetInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetInput: {
    flex: 1,
    marginBottom: 0,
  },
  budgetSeparator: {
    fontSize: 16,
    color: colors.textSecondary,
    marginHorizontal: spacing.md,
  },
  urgencyList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  urgencyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  urgencyChipText: {
    fontSize: 14,
    color: colors.text,
  },
  urgencyChipTextSelected: {
    color: colors.surface,
  },
  radiusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  radiusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  radiusChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  radiusChipText: {
    fontSize: 14,
    color: colors.text,
  },
  radiusChipTextSelected: {
    color: colors.surface,
  },
  modalFooter: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  // Discovery styles
  discoveryContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  discoverySection: {
    marginVertical: spacing.lg,
  },
  discoverySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  discoverySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: spacing.sm,
  },
  discoverySectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginRight: spacing.xs,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  locationButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  quickCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickCategoryItem: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickCategoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickCategoryText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  searchTips: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
  },
  searchTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  searchTipText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 20,
  },
});

export default SearchScreen;