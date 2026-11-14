import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import BrandWordmark from './BrandWordmark';
import { useBrandStatusBar } from '../../hooks/useBrandStatusBar';

interface Props {
  /** Icons/buttons shown on the right of the logo row (render them white) */
  actions?: React.ReactNode;
  /** Content inside the purple band below the logo row, e.g. the search bar */
  children?: React.ReactNode;
}

/**
 * The app's one bold brand moment: a purple band with the mascot and wordmark, mirroring the
 * web header. Everything below it (cards, lists) stays quiet.
 */
const BrandHeader: React.FC<Props> = ({ actions, children }) => {
  const insets = useSafeAreaInsets();
  useBrandStatusBar();
  return (
    <LinearGradient
      colors={colors.primaryGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.band, { paddingTop: insets.top + spacing.sm }]}
    >
      <View style={styles.row}>
        <View style={styles.brand}>
          <View style={styles.mascotBadge}>
            <Image
              source={require('../../assets/images/mascot.png')}
              style={styles.mascot}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
          <BrandWordmark size={24} />
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {children ? <View style={styles.content}>{children}</View> : null}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  band: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mascotBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondaryOrange,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  mascot: {
    width: 36,
    height: 38,
    marginBottom: -4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    marginTop: spacing.md,
  },
});

export default BrandHeader;
