import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { colors } from '../../theme';
import { fonts } from '../../theme/fonts';

interface Props {
  /** 'light' on purple backgrounds, 'dark' on white */
  tone?: 'light' | 'dark';
  size?: number;
  style?: StyleProp<TextStyle>;
}

/** "ArayanıBUL" set like the web header: the first part in the base colour, "BUL" in brand orange. */
const BrandWordmark: React.FC<Props> = ({ tone = 'light', size = 24, style }) => (
  <Text
    style={[styles.base, { fontSize: size, color: tone === 'light' ? '#ffffff' : colors.primaryDark }, style]}
    accessibilityRole="header"
    accessibilityLabel="Arayanibul"
    allowFontScaling={false}
  >
    Arayanı<Text style={styles.accent}>BUL</Text>
  </Text>
);

const styles = StyleSheet.create({
  base: {
    fontFamily: fonts.display,
    letterSpacing: -0.3,
  },
  accent: {
    color: colors.secondaryOrange,
  },
});

export default BrandWordmark;
