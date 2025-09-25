import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, spacing, typography } from '../../theme';

interface DividerProps {
  text?: string;
  color?: string;
  thickness?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  orientation?: 'horizontal' | 'vertical';
}

const Divider: React.FC<DividerProps> = ({
  text,
  color = colors.border,
  thickness = 1,
  style,
  textStyle,
  orientation = 'horizontal',
}) => {
  if (text) {
    return (
      <View style={[styles.textDividerContainer, style]}>
        <View style={[styles.line, { backgroundColor: color, height: thickness }]} />
        <Text style={[styles.text, textStyle]}>{text}</Text>
        <View style={[styles.line, { backgroundColor: color, height: thickness }]} />
      </View>
    );
  }

  const dividerStyle: ViewStyle = orientation === 'horizontal' 
    ? { height: thickness, backgroundColor: color }
    : { width: thickness, backgroundColor: color };

  return <View style={[dividerStyle, style]} />;
};

const styles = StyleSheet.create({
  textDividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  line: {
    flex: 1,
  },
  text: {
    marginHorizontal: spacing.md,
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default Divider;