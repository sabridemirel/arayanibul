import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface BadgeProps {
  text?: string;
  count?: number;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Badge: React.FC<BadgeProps> = ({
  text,
  count,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
}) => {
  const displayText = text || (count !== undefined ? (count > 99 ? '99+' : count.toString()) : '');
  
  if (!displayText) return null;
  const getBadgeStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      alignSelf: 'flex-start',
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.paddingHorizontal = spacing.xs;
        baseStyle.paddingVertical = 2;
        break;
      case 'large':
        baseStyle.paddingHorizontal = spacing.md;
        baseStyle.paddingVertical = spacing.sm;
        break;
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        baseStyle.backgroundColor = colors.secondary;
        break;
      case 'success':
        baseStyle.backgroundColor = colors.success;
        break;
      case 'warning':
        baseStyle.backgroundColor = colors.warning;
        break;
      case 'error':
        baseStyle.backgroundColor = colors.error;
        break;
      case 'info':
        baseStyle.backgroundColor = colors.info;
        break;
      default: // primary
        baseStyle.backgroundColor = colors.primary;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      color: colors.surface,
      fontWeight: '600',
      textAlign: 'center',
    };

    // Size styles
    switch (size) {
      case 'small':
        baseTextStyle.fontSize = 10;
        break;
      case 'large':
        baseTextStyle.fontSize = 14;
        break;
      default: // medium
        baseTextStyle.fontSize = 12;
    }

    // Warning variant uses dark text
    if (variant === 'warning') {
      baseTextStyle.color = colors.dark;
    }

    return baseTextStyle;
  };

  return (
    <View style={[getBadgeStyle(), style]}>
      <Text style={[getTextStyle(), textStyle]}>{displayText}</Text>
    </View>
  );
};

export default Badge;