import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../../theme';
import { fonts } from '../../../theme/fonts';

interface Props {
  illustration: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  step: number;
  totalSteps: number;
  primaryLabel: string;
  onPrimary: () => void;
  onBack?: () => void;
  onSkip: () => void;
}

/** Shared onboarding slide: brand gradient, mascot-led illustration, white type, orange action. */
const OnboardingLayout: React.FC<Props> = ({
  illustration, title, description, features, step, totalSteps, primaryLabel, onPrimary, onBack, onSkip,
}) => (
  <LinearGradient colors={colors.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.flex}>
    <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={onSkip}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.skip}
          accessibilityRole="button"
          accessibilityLabel="Tanıtımı geç"
        >
          <Text style={styles.skipText}>Geç</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.illustration}>{illustration}</View>

      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.features}>
          {features.map(feature => (
            <View key={feature} style={styles.feature}>
              <MaterialIcons name="check-circle" size={20} color={colors.secondaryOrange} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Adım ${step} / ${totalSteps}`}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <View key={i} style={[styles.dot, i + 1 === step && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.buttons}>
          {onBack ? (
            <TouchableOpacity
              style={[styles.button, styles.backButton]}
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Geri"
            >
              <MaterialIcons name="arrow-back" size={20} color="#ffffff" />
              <Text style={styles.backText}>Geri</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={onPrimary}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
          >
            <Text style={styles.primaryText}>{primaryLabel}</Text>
            <MaterialIcons name="arrow-forward" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  </LinearGradient>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  skip: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  skipText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
  illustration: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  content: { paddingHorizontal: 32, paddingBottom: 8 },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 36,
    color: '#ffffff',
    marginBottom: 10,
  },
  description: { fontSize: 17, lineHeight: 25, color: 'rgba(255,255,255,0.88)', marginBottom: 20 },
  features: { gap: 12 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 15, color: '#ffffff', flexShrink: 1 },
  footer: { paddingHorizontal: 32, paddingTop: 28, paddingBottom: 24, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { width: 24, backgroundColor: '#ffffff' },
  buttons: { flexDirection: 'row', gap: 12 },
  button: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButton: { backgroundColor: colors.secondaryOrange },
  // Dark text on orange: white on #F59E0B is too low-contrast to read
  primaryText: { fontSize: 16, fontWeight: '800', color: colors.accent },
  backButton: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)' },
  backText: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
});

export default OnboardingLayout;
