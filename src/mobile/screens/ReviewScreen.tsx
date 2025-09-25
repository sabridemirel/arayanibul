import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList, CreateReviewRequest, UpdateReviewRequest, Review } from '../types';
import { reviewAPI } from '../services/api';
import { StarRating } from '../components/ui/StarRating';
import { Button } from '../components/ui/Button';
import { Loading } from '../components/ui/Loading';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useAuth } from '../contexts/AuthContext';

type ReviewScreenRouteProp = RouteProp<RootStackParamList, 'Review'>;
type ReviewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Review'>;

interface ReviewScreenParams {
  revieweeId: string;
  revieweeName: string;
  offerId?: number;
  existingReview?: Review;
  mode?: 'create' | 'edit';
}

export const ReviewScreen: React.FC = () => {
  const navigation = useNavigation<ReviewScreenNavigationProp>();
  const route = useRoute<ReviewScreenRouteProp>();
  const { user } = useAuth();
  
  const {
    revieweeId,
    revieweeName,
    offerId,
    existingReview,
    mode = 'create'
  } = route.params as ReviewScreenParams;

  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canReview, setCanReview] = useState(true);

  useEffect(() => {
    navigation.setOptions({
      title: mode === 'edit' ? 'Değerlendirmeyi Düzenle' : 'Değerlendirme Yap',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, mode]);

  useEffect(() => {
    if (mode === 'create') {
      checkCanReview();
    }
  }, [mode, revieweeId, offerId]);

  const checkCanReview = async () => {
    try {
      const result = await reviewAPI.canReview(revieweeId, offerId);
      setCanReview(result);
      if (!result) {
        setError('Bu kullanıcıyı değerlendiremezsiniz.');
      }
    } catch (err) {
      console.error('Error checking review permission:', err);
      setError('Değerlendirme izni kontrol edilemedi.');
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Hata', 'Lütfen bir puan verin.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'edit' && existingReview) {
        const updateData: UpdateReviewRequest = {
          rating,
          comment: comment.trim() || undefined,
        };
        await reviewAPI.updateReview(existingReview.id, updateData);
        Alert.alert('Başarılı', 'Değerlendirmeniz güncellendi.', [
          { text: 'Tamam', onPress: () => navigation.goBack() }
        ]);
      } else {
        const reviewData: CreateReviewRequest = {
          revieweeId,
          offerId,
          rating,
          comment: comment.trim() || undefined,
        };
        await reviewAPI.createReview(reviewData);
        Alert.alert('Başarılı', 'Değerlendirmeniz kaydedildi.', [
          { text: 'Tamam', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setError(err.response?.data?.message || 'Değerlendirme kaydedilemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canReview && mode === 'create') {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Değerlendirme Yapılamaz</Text>
          <Text style={styles.errorText}>
            Bu kullanıcıyı değerlendirmek için gerekli koşulları sağlamıyorsunuz.
          </Text>
          <Button
            title="Geri Dön"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.userInfo}>
            <MaterialIcons name="person" size={48} color="#666" />
            <Text style={styles.userName}>{revieweeName}</Text>
            <Text style={styles.userLabel}>
              {mode === 'edit' ? 'Değerlendirmenizi güncelleyin' : 'Değerlendirin'}
            </Text>
          </View>

          <View style={styles.ratingSection}>
            <Text style={styles.sectionTitle}>Puanınız</Text>
            <View style={styles.ratingContainer}>
              <StarRating
                rating={rating}
                size={32}
                onRatingChange={setRating}
                disabled={isLoading}
              />
              <Text style={styles.ratingText}>
                {rating > 0 ? `${rating}/5` : 'Puan verin'}
              </Text>
            </View>
          </View>

          <View style={styles.commentSection}>
            <Text style={styles.sectionTitle}>Yorumunuz (İsteğe bağlı)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Deneyiminizi paylaşın..."
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              maxLength={1000}
              textAlignVertical="top"
              editable={!isLoading}
            />
            <Text style={styles.characterCount}>
              {comment.length}/1000 karakter
            </Text>
          </View>

          {error && (
            <ErrorMessage
              message={error}
              onRetry={() => setError(null)}
              showRetry={false}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={isLoading ? 'Kaydediliyor...' : mode === 'edit' ? 'Güncelle' : 'Değerlendirmeyi Kaydet'}
          onPress={handleSubmit}
          disabled={isLoading || rating === 0}
          loading={isLoading}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 32,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  userLabel: {
    fontSize: 14,
    color: '#666',
  },
  ratingSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  ratingContainer: {
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  commentSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    backgroundColor: '#FAFAFA',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backButton: {
    minWidth: 120,
  },
});