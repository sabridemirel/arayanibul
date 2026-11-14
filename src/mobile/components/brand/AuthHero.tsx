import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '../../theme';
import { fonts } from '../../theme/fonts';
import BrandWordmark from './BrandWordmark';
import { useBrandStatusBar } from '../../hooks/useBrandStatusBar';

interface Props {
  title: string;
  subtitle: string;
  /** Horizontal padding of the surrounding scroll container, so the band can bleed edge to edge */
  bleed?: number;
}

/** Purple top band for the sign-in and sign-up screens (mascot, wordmark, screen title). */
const AuthHero: React.FC<Props> = ({ title, subtitle, bleed = 20 }) => {
  useBrandStatusBar();
  return (
  <LinearGradient
    colors={colors.primaryGradient}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.band, { marginHorizontal: -bleed, marginTop: -bleed }]}
  >
    <View style={styles.disc}>
      <Image
        source={require('../../assets/images/mascot.png')}
        style={styles.mascot}
        resizeMode="contain"
        accessible={false}
      />
    </View>
    <BrandWordmark size={26} style={styles.wordmark} />
    <Text style={styles.title} accessibilityRole="header">{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
  </LinearGradient>
  );
};

const styles = StyleSheet.create({
  band: {
    alignItems: 'center',
    paddingTop: spacing.xl + spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: spacing.lg,
  },
  disc: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.secondaryOrange,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  mascot: { width: 80, height: 100, marginBottom: -12 },
  wordmark: { marginBottom: spacing.md },
  title: { fontFamily: fonts.display, fontSize: 26, color: '#ffffff' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
});

export default AuthHero;
