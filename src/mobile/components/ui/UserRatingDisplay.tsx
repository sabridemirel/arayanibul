import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { StarRating } from './StarRating';

interface UserRatingDisplayProps {
  rating: number;
  reviewCount: number;
  size?: 'small' | 'medium' | 'large';
  showReviewCount?: boolean;
  onPress?: () => void;
  style?: any;
}

export const UserRatingDisplay: React.FC<UserRatingDisplayProps> = ({
  rating,
  reviewCount,
  size = 'medium',
  showReviewCount = true,
  onPress,
  style,
}) => {
  const getSizes = () => {
    switch (size) {
      case 'small':
        return {
          starSize: 14,
          ratingText: 12,
          reviewText: 10,
          spacing: 4,
        };
      case 'large':
        return {
          starSize: 20,
          ratingText: 16,
          reviewText: 14,
          spacing: 8,
        };
      default: // medium
        return {
          starSize: 16,
          ratingText: 14,
          reviewText: 12,
          spacing: 6,
        };
    }
  };

  const sizes = getSizes();

  const formatRating = (rating: number) => {
    return rating > 0 ? rating.toFixed(1) : '0.0';
  };

  const formatReviewCount = (count: number) => {
    if (count === 0) return 'Henüz değerlendirme yok';
    if (count === 1) return '1 değerlendirme';
    return `${count} değerlendirme`;
  };

  const content = (
    <View style={[styles.container, { gap: sizes.spacing }, style]}>
      <View style={styles.ratingRow}>
        <StarRating
          rating={rating}
          size={sizes.starSize}
          disabled
          showHalfStars
        />
        <Text style={[styles.ratingText, { fontSize: sizes.ratingText }]}>
          {formatRating(rating)}
        </Text>
      </View>
      
      {showReviewCount && (
        <Text style={[styles.reviewCountText, { fontSize: sizes.reviewText }]}>
          {formatReviewCount(reviewCount)}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontWeight: '600',
    color: '#333',
  },
  reviewCountText: {
    color: '#666',
  },
});