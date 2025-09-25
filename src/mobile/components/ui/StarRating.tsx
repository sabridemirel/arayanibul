import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  color?: string;
  emptyColor?: string;
  onRatingChange?: (rating: number) => void;
  disabled?: boolean;
  showHalfStars?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 24,
  color = '#FFD700',
  emptyColor = '#E0E0E0',
  onRatingChange,
  disabled = false,
  showHalfStars = false,
}) => {
  const handleStarPress = (starIndex: number) => {
    if (disabled || !onRatingChange) return;
    onRatingChange(starIndex + 1);
  };

  const renderStar = (index: number) => {
    const starValue = index + 1;
    let iconName: keyof typeof MaterialIcons.glyphMap = 'star-border';
    
    if (showHalfStars) {
      if (rating >= starValue) {
        iconName = 'star';
      } else if (rating >= starValue - 0.5) {
        iconName = 'star-half';
      }
    } else {
      iconName = rating >= starValue ? 'star' : 'star-border';
    }

    const starColor = rating >= starValue ? color : emptyColor;

    if (onRatingChange && !disabled) {
      return (
        <TouchableOpacity
          key={index}
          onPress={() => handleStarPress(index)}
          style={styles.starButton}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={iconName}
            size={size}
            color={starColor}
          />
        </TouchableOpacity>
      );
    }

    return (
      <MaterialIcons
        key={index}
        name={iconName}
        size={size}
        color={starColor}
        style={styles.star}
      />
    );
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxRating }, (_, index) => renderStar(index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    padding: 2,
  },
  star: {
    marginHorizontal: 1,
  },
});