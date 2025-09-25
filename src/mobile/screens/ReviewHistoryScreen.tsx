import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList, Review } from '../types';
import { reviewAPI } from '../services/api';
import { ReviewCard } from '../components/ui/ReviewCard';
import { Loading } from '../components/ui/Loading';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useAuth } from '../contexts/AuthContext';

type ReviewHistoryScreenRouteProp = RouteProp<RootStackParamList, 'ReviewHistory'>;
type ReviewHistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ReviewHistory'>;

interface ReviewHistoryScreenParams {
  userId?: string;
}

export const ReviewHistoryScreen: React.FC = () => {
  const navigation = useNavigation<ReviewHistoryScreenNavigationProp>();
  const route = useRoute<ReviewHistoryScreenRouteProp>();
  const { user } = useAuth();
  
  const { userId } = route.params as ReviewHistoryScreenParams;
  const targetUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  const [activeTab, setActiveTab] = useState<'given' | 'received'>('received');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: isOwnProfile ? 'Değerlendirmelerim' : 'Değerlendirmeler',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isOwnProfile]);

  useFocusEffect(
    useCallback(() => {
      loadReviews();
    }, [activeTab, targetUserId])
  );

  const loadReviews = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      let reviewsData: Review[];
      
      if (isOwnProfile) {
        // For own profile, use specific endpoints
        if (activeTab === 'given') {
          reviewsData = await reviewAPI.getMyReviews();
        } else {
          reviewsData = await reviewAPI.getReceivedReviews();
        }
      } else {
        // For other users, use general endpoint
        reviewsData = await reviewAPI.getUserReviews(targetUserId!, activeTab === 'given');
      }
      
      setReviews(reviewsData);
    } catch (err: any) {
      console.error('Error loading reviews:', err);
      setError(err.response?.data?.message || 'Değerlendirmeler yüklenemedi.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadReviews(true);
  };

  const handleEditReview = (review: Review) => {
    navigation.navigate('Review', {
      revieweeId: review.revieweeId,
      revieweeName: review.revieweeName,
      offerId: review.offerId,
      existingReview: review,
      mode: 'edit',
    });
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      await reviewAPI.deleteReview(reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      Alert.alert('Başarılı', 'Değerlendirme silindi.');
    } catch (err: any) {
      console.error('Error deleting review:', err);
      Alert.alert('Hata', err.response?.data?.message || 'Değerlendirme silinemedi.');
    }
  };

  const handleReportReview = (reviewId: number) => {
    Alert.alert(
      'Şikayet Et',
      'Bu değerlendirmeyi neden şikayet etmek istiyorsunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Uygunsuz İçerik', onPress: () => submitReport(reviewId, 'inappropriate') },
        { text: 'Spam', onPress: () => submitReport(reviewId, 'spam') },
        { text: 'Yanlış Bilgi', onPress: () => submitReport(reviewId, 'false_info') },
      ]
    );
  };

  const submitReport = (reviewId: number, reason: string) => {
    // This would typically call a report API endpoint
    Alert.alert('Teşekkürler', 'Şikayetiniz alındı ve incelenecek.');
  };

  const renderTabButton = (tab: 'given' | 'received', title: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderReview = ({ item }: { item: Review }) => (
    <ReviewCard
      review={item}
      showReviewee={activeTab === 'given'}
      showReviewer={activeTab === 'received'}
      onEdit={isOwnProfile && activeTab === 'given' ? handleEditReview : undefined}
      onDelete={isOwnProfile && activeTab === 'given' ? handleDeleteReview : undefined}
      onReport={!isOwnProfile ? handleReportReview : undefined}
      currentUserId={user?.id}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons 
        name={activeTab === 'given' ? 'rate-review' : 'star-border'} 
        size={48} 
        color="#CCC" 
      />
      <Text style={styles.emptyStateTitle}>
        {activeTab === 'given' ? 'Henüz değerlendirme yapmadınız' : 'Henüz değerlendirme almadınız'}
      </Text>
      <Text style={styles.emptyStateText}>
        {activeTab === 'given' 
          ? 'Tamamladığınız işlemler için değerlendirme yapabilirsiniz.'
          : 'Diğer kullanıcılar sizi değerlendirdikçe burada görünecek.'
        }
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Loading text="Değerlendirmeler yükleniyor..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {renderTabButton('received', isOwnProfile ? 'Aldığım' : 'Aldığı')}
        {isOwnProfile && renderTabButton('given', 'Verdiğim')}
      </View>

      {error ? (
        <ErrorMessage
          message={error}
          onRetry={() => loadReviews()}
          showRetry={true}
        />
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReview}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#007AFF',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabButtonText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
});