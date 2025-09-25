import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  textColor?: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  maxCount = 99,
  size = 'medium',
  color,
  textColor,
}) => {
  const { theme } = useTheme();

  if (count <= 0) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  const badgeColor = color || theme.colors.error;
  const badgeTextColor = textColor || 'white';

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          fontSize: 10,
        };
      case 'large':
        return {
          minWidth: 24,
          height: 24,
          borderRadius: 12,
          fontSize: 14,
        };
      default:
        return {
          minWidth: 20,
          height: 20,
          borderRadius: 10,
          fontSize: 12,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeColor,
          minWidth: sizeStyles.minWidth,
          height: sizeStyles.height,
          borderRadius: sizeStyles.borderRadius,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: badgeTextColor,
            fontSize: sizeStyles.fontSize,
          },
        ]}
        numberOfLines={1}
      >
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  badgeText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default NotificationBadge;