import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padding?: 'none' | 'small' | 'medium' | 'large';
  shadow?: boolean;
  borderColor?: string;
  backgroundColor?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 'medium',
  shadow = true,
  borderColor,
  backgroundColor = colors.surface,
}) => {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: borderColor || colors.border,
    };

    // Padding
    switch (padding) {
      case 'none':
        break;
      case 'small':
        baseStyle.padding = spacing.sm;
        break;
      case 'large':
        baseStyle.padding = spacing.xl;
        break;
      default: // medium
        baseStyle.padding = spacing.md;
    }

    // Shadow
    if (shadow) {
      baseStyle.shadowColor = '#000';
      baseStyle.shadowOffset = { width: 0, height: 2 };
      baseStyle.shadowOpacity = 0.1;
      baseStyle.shadowRadius = 4;
      baseStyle.elevation = 3;
    }

    return baseStyle;
  };

  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
};

export default Card;