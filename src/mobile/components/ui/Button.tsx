import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  Animated,
  Pressable,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  gradient?: boolean;
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  // Accessibility props
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  gradient = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.md,
      borderWidth: variant === 'outline' ? 2 : 0,
      overflow: 'hidden',
    };

    // Size styles - All sizes meet 44pt minimum touch target (WCAG)
    switch (size) {
      case 'small':
        baseStyle.paddingHorizontal = spacing.md;
        baseStyle.paddingVertical = spacing.sm;
        baseStyle.minHeight = 44; // Changed from 36 for accessibility
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

    // Variant styles - Updated with new color palette
    switch (variant) {
      case 'secondary':
        baseStyle.backgroundColor = colors.secondaryOrangeDark; // Orange background
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderColor = colors.primary; // Purple border
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderWidth = 0;
        break;
      case 'danger':
        baseStyle.backgroundColor = colors.error;
        break;
      case 'warning':
        baseStyle.backgroundColor = colors.warning;
        break;
      default: // primary
        if (!gradient) {
          baseStyle.backgroundColor = colors.primary; // Purple background
        }
    }

    // Disabled state
    if (disabled || loading) {
      baseStyle.opacity = 0.5;
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

    // Variant styles - Accessible text colors with new palette
    switch (variant) {
      case 'outline':
      case 'ghost':
        baseTextStyle.color = colors.primary; // Purple text
        break;
      case 'warning':
        baseTextStyle.color = colors.warningText; // Black text for contrast
        break;
      case 'secondary':
        baseTextStyle.color = colors.onOrangeDark; // White text on orange
        break;
      case 'primary':
      case 'danger':
        baseTextStyle.color = colors.onPrimary; // White text
        break;
      default:
        baseTextStyle.color = colors.text;
    }

    return baseTextStyle;
  };

  const getIconColor = (): string => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return colors.primary; // Purple icon
      case 'warning':
        return colors.warningText; // Black icon for contrast
      case 'secondary':
        return colors.onOrangeDark; // White icon on orange
      case 'primary':
      case 'danger':
        return colors.onPrimary; // White icon
      default:
        return colors.text;
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

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator
          size={size === 'small' ? 'small' : 'small'}
          color={getIconColor()}
          accessibilityLabel="Yükleniyor"
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && renderIcon()}
          <Text
            style={[getTextStyle(), textStyle]}
            allowFontScaling={true}
            accessible={false} // Button handles accessibility
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && renderIcon()}
        </>
      )}
    </>
  );

  const buttonStyle = getButtonStyle();

  return (
    <Animated.View
      style={[
        buttonStyle,
        style,
        {
          transform: [{ scale: scaleValue }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={{
          width: '100%',
          height: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        // Accessibility props
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{
          disabled: disabled || loading,
          busy: loading,
        }}
      >
        {variant === 'primary' && gradient && !disabled && !loading ? (
          <LinearGradient
            colors={colors.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              borderRadius: borderRadius.md,
            }}
          />
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          {buttonContent}
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default Button;