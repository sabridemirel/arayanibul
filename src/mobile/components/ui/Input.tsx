import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof MaterialIcons.glyphMap;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  showPasswordToggle?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  showPasswordToggle = false,
  secureTextEntry,
  multiline = false,
  numberOfLines = 1,
  ...textInputProps
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handlePasswordToggle = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const getContainerStyle = (): ViewStyle => ({
    marginBottom: spacing.md,
  });

  const getInputContainerStyle = (): ViewStyle => ({
    flexDirection: 'row',
    alignItems: multiline ? 'flex-start' : 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: error ? colors.error : isFocused ? colors.primary : colors.border,
    paddingHorizontal: spacing.md,
    minHeight: multiline ? Math.max(48, numberOfLines * 24 + 24) : 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  });

  const getInputStyle = (): TextStyle => ({
    flex: 1,
    fontSize: typography.body.fontSize,
    color: colors.text,
    paddingVertical: spacing.sm,
  });

  const getLabelStyle = (): TextStyle => ({
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  });

  const getErrorStyle = (): TextStyle => ({
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  });

  const renderLeftIcon = () => {
    if (!leftIcon) return null;
    return (
      <MaterialIcons 
        name={leftIcon} 
        size={20} 
        color={colors.textSecondary}
        style={{ 
          marginRight: spacing.sm,
          marginTop: multiline ? spacing.sm : 0
        }}
      />
    );
  };

  const renderRightIcon = () => {
    if (showPasswordToggle && secureTextEntry !== undefined) {
      return (
        <TouchableOpacity onPress={handlePasswordToggle} style={{ padding: spacing.xs }}>
          <MaterialIcons 
            name={isPasswordVisible ? "visibility" : "visibility-off"} 
            size={20} 
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      );
    }

    if (!rightIcon) return null;
    
    return (
      <TouchableOpacity 
        onPress={onRightIconPress} 
        style={{ padding: spacing.xs }}
        disabled={!onRightIconPress}
      >
        <MaterialIcons 
          name={rightIcon} 
          size={20} 
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[getContainerStyle(), containerStyle]}>
      {label && (
        <Text style={[getLabelStyle(), labelStyle]}>{label}</Text>
      )}
      
      <View style={getInputContainerStyle()}>
        {renderLeftIcon()}
        
        <TextInput
          style={[getInputStyle(), inputStyle]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={showPasswordToggle ? !isPasswordVisible : secureTextEntry}
          placeholderTextColor={colors.textSecondary}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...textInputProps}
        />
        
        {renderRightIcon()}
      </View>
      
      {error && (
        <Text style={[getErrorStyle(), errorStyle]}>{error}</Text>
      )}
    </View>
  );
};

export default Input;