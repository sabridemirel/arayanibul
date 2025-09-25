import React from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, spacing, typography } from '../../theme';
import { LoadingProps } from '../../types';

const Loading: React.FC<LoadingProps> = ({
  size = 'large',
  color = colors.primary,
  text,
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
      <ActivityIndicator size={size} color={color} />
      {text && (
        <Text style={styles.text}>{text}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    marginTop: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default Loading;