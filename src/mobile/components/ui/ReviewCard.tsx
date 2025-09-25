import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Review } from '../../types';
import { StarRating } from './StarRating';
import { Card } from './Card';

interface ReviewCardProps {
  review: Review;
  showReviewee?: boolean;
  showReviewer?: boolean;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: number) => void;
  onReport?: (reviewId: number) => void;
  currentUserId?: string;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  showReviewee = false,
  showReviewer = true,
  onEdit,
  onDelete,
  onReport,
  currentUserId,
}) => {
  const isOwnReview = currentUserId === review.reviewerId;
  const displayName = showReviewer ? review.reviewerName : review.revieweeName;
  const profileImage = showReviewer ? review.reviewerProfileImage : undefined;

  const handleMoreOptions = () => {
    const options = [];
    
    if (isOwnReview && onEdit) {
      options.push({ text: 'Düzenle', onPress: () => onEdit(review) });
    }
    
    if (isOwnReview && onDelete) {
      options.push({ 
        text: 'Sil', 
        style: 'destructive' as const,
        onPress: () => {
          Alert.alert(
            'Değerlendirmeyi Sil',
            'Bu değerlendirmeyi silmek istediğinizden emin misiniz?',
            [
              { text: 'İptal', style: 'cancel' },
              { 
                text: 'Sil', 
                style: 'destructive',
                onPress: () => onDelete(review.id)
              }
            ]
          );
        }
      });
    }
    
    if (!isOwnReview && onReport) {
      options.push({ 
        text: 'Şikayet Et', 
        style: 'destructive' as const,
        onPress: () => onReport(review.id)
      });
    }

    options.push({ text: 'İptal', style: 'cancel' as const });

    Alert.alert('Seçenekler', '', options);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <MaterialIcons name="person" size={24} color="#666" />
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <StarRating rating={review.rating} size={16} disabled />
          {(isOwnReview || onReport) && (
            <TouchableOpacity
              onPress={handleMoreOptions}
              style={styles.moreButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons name="more-vert" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {review.comment && (
        <Text style={styles.comment}>{review.comment}</Text>
      )}

      {showReviewee && (
        <View style={styles.revieweeInfo}>
          <Text style={styles.revieweeLabel}>Değerlendirilen:</Text>
          <Text style={styles.revieweeName}>{review.revieweeName}</Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreButton: {
    marginLeft: 8,
    padding: 4,
  },
  comment: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  revieweeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  revieweeLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  revieweeName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
});