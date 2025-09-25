import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.md,
      borderWidth: 1,
    };

    // Size styles
    switch (size) {
      case 'small':
        baseStyle.paddingHorizontal = spacing.md;
        baseStyle.paddingVertical = spacing.sm;
        baseStyle.minHeight = 36;
        break;
      case 'large':
        baseStyle.paddingHorizontal = spacing.xl;
        baseStyle.paddingVertical = spacing.md;
        baseStyle.minHeight = 56;
        break;
      default: // medium
        baseStyle.paddingHorizontal = spacing.lg;
        baseStyle.paddingVertical = spacing.md;
        baseStyle.minHeight = 48;
    }

    // Variant styles
    switch (variant) {
      case 'secondary':
        baseStyle.backgroundColor = colors.secondary;
        baseStyle.borderColor = colors.secondary;
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderColor = colors.primary;
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderColor = 'transparent';
        break;
      case 'danger':
        baseStyle.backgroundColor = colors.error;
        baseStyle.borderColor = colors.error;
        break;
      default: // primary
        baseStyle.backgroundColor = colors.primary;
        baseStyle.borderColor = colors.primary;
    }

    // Disabled state
    if (disabled || loading) {
      baseStyle.opacity = 0.6;
    }

    // Full width
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: '600',
    };

    // Size styles
    switch (size) {
      case 'small':
        baseTextStyle.fontSize = 14;
        break;
      case 'large':
        baseTextStyle.fontSize = 18;
        break;
      default: // medium
        baseTextStyle.fontSize = 16;
    }

    // Variant styles
    switch (variant) {
      case 'outline':
      case 'ghost':
        baseTextStyle.color = colors.primary;
        break;
      default:
        baseTextStyle.color = variant === 'primary' || variant === 'danger' || variant === 'secondary' 
          ? colors.surface 
          : colors.text;
    }

    return baseTextStyle;
  };

  const getIconColor = (): string => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return colors.primary;
      default:
        return variant === 'primary' || variant === 'danger' || variant === 'secondary' 
          ? colors.surface 
          : colors.text;
    }
  };

  const renderIcon = () => {
    if (!icon) return null;
    
    const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;
    const iconColor = getIconColor();
    
    return (
      <MaterialIcons 
        name={icon} 
        size={iconSize} 
        color={iconColor}
        style={iconPosition === 'right' ? { marginLeft: spacing.sm } : { marginRight: spacing.sm }}
      />
    );
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          size={size === 'small' ? 'small' : 'small'} 
          color={getIconColor()} 
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && renderIcon()}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' && renderIcon()}
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;