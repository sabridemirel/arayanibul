import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { ErrorProps } from '../../types';
import Button from './Button';

const ErrorMessage: React.FC<ErrorProps> = ({
  message,
  onRetry,
  showRetry = true,
}) => {
  const getContainerStyle = (): ViewStyle => ({
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  });

  return (
    <View style={getContainerStyle()}>
      <View style={styles.errorContainer}>
        <MaterialIcons 
          name="error-outline" 
          size={64} 
          color={colors.error} 
          style={styles.errorIcon}
        />
        
        <Text style={styles.errorTitle}>Bir Hata Oluştu</Text>
        
        <Text style={styles.errorMessage}>{message}</Text>
        
        {showRetry && onRetry && (
          <Button
            title="Tekrar Dene"
            onPress={onRetry}
            variant="outline"
            icon="refresh"
            style={styles.retryButton}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorIcon: {
    marginBottom: spacing.md,
  },
  errorTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  retryButton: {
    minWidth: 120,
  },
});

export default ErrorMessage;