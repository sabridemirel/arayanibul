// OnboardingSlide3.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// import LottieView from 'lottie-react-native';

interface OnboardingSlide3Props {
  onGetStarted: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ANIMATION_HEIGHT = SCREEN_HEIGHT * 0.4;

const OnboardingSlide3: React.FC<OnboardingSlide3Props> = ({
  onGetStarted,
  onBack,
  onSkip
}) => {
  // const animationRef = useRef<LottieView>(null);

  // useEffect(() => {
  //   animationRef.current?.play();
  // }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Skip Button */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={onSkip}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel="Kayıt ekranına geç"
        accessibilityHint="Onboarding'i atla ve giriş ekranına git"
      >
        <Text style={styles.skipButtonText} allowFontScaling={true}>Atla</Text>
      </TouchableOpacity>

      {/* Animation Area */}
      <View style={styles.animationContainer}>
        {/* Placeholder */}
        <View style={styles.animationPlaceholder}>
          <View style={styles.shieldContainer}>
            <View style={styles.shield}>
              <MaterialIcons name="verified-user" size={80} color="#28a745" />
            </View>
            <View style={styles.lockBadge}>
              <MaterialIcons name="lock" size={24} color="#ffffff" />
            </View>
          </View>
        </View>

        {/* Uncomment when Lottie is installed:
        <LottieView
          ref={animationRef}
          source={require('../../assets/animations/secure-payment.json')}
          autoPlay
          loop
          style={styles.animation}
          speed={0.9}
        />
        */}
      </View>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        <Text style={styles.heading} allowFontScaling={true}>Güvenli Öde</Text>
        <Text style={styles.description} allowFontScaling={true}>
          İşiniz bitene kadar paranız emanette. Güvenli alışveriş!
        </Text>

        {/* Features List */}
        <View style={styles.featuresList}>
          <FeatureItem
            emoji="🔒"
            text="Emanet ödeme sistemi"
          />
          <FeatureItem
            icon="check-circle"
            text="Alıcı koruması"
            iconColor="#28a745"
          />
          <FeatureItem
            emoji="💳"
            text="Güvenli ödeme yöntemleri"
          />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.paginationContainer}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={[styles.dot, styles.dotActive]} />
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Geri"
            accessibilityHint="Önceki onboarding slaytına dönmek için dokunun"
          >
            <MaterialIcons name="arrow-back" size={20} color="#6c757d" />
            <Text style={styles.backButtonText} allowFontScaling={true}>Geri</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.getStartedButtonContainer}
            onPress={onGetStarted}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Başla"
            accessibilityHint="Onboarding'i tamamla ve giriş ekranına geç"
          >
            <LinearGradient
              colors={['#007bff', '#0056b3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.getStartedButton}
            >
              <Text style={styles.getStartedButtonText} allowFontScaling={true}>Başla!</Text>
              <Text style={styles.getStartedEmoji} allowFontScaling={true}>🎉</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Feature Item Component (supports both emoji and icon)
interface FeatureItemProps {
  emoji?: string;
  icon?: string;
  iconColor?: string;
  text: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({
  emoji,
  icon,
  iconColor = '#007bff',
  text
}) => (
  <View style={styles.featureItem}>
    {emoji ? (
      <Text style={styles.featureEmoji} allowFontScaling={true}>{emoji}</Text>
    ) : icon ? (
      <MaterialIcons name={icon as any} size={20} color={iconColor} />
    ) : null}
    <Text style={styles.featureText} allowFontScaling={true}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // Skip Button
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },

  // Animation Area
  animationContainer: {
    height: ANIMATION_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 20,
  },
  animationPlaceholder: {
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shield: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockBadge: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  animation: {
    width: 300,
    height: 300,
  },

  // Content Area
  contentContainer: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  description: {
    fontSize: 17,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },

  // Features List
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  featureEmoji: {
    fontSize: 20,
    width: 24,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#333333',
    lineHeight: 22,
    flex: 1,
  },

  // Footer
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 32,
    gap: 24,
  },

  // Pagination
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e9ecef',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#007bff',
  },

  // Navigation Buttons
  navigationButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  backButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    lineHeight: 20,
  },
  getStartedButtonContainer: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  getStartedButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
  },
  getStartedButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 20,
  },
  getStartedEmoji: {
    fontSize: 20,
  },
});

export default OnboardingSlide3;