// OnboardingSlide2.tsx
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
import { LinearGradient } from 'expo-linear-gradient'; // npx expo install expo-linear-gradient
// import LottieView from 'lottie-react-native';

interface OnboardingSlide2Props {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ANIMATION_HEIGHT = SCREEN_HEIGHT * 0.4;

const OnboardingSlide2: React.FC<OnboardingSlide2Props> = ({
  onNext,
  onBack,
  onSkip
}) => {
  // const animationRef = useRef<LottieView>(null);

  // useEffect(() => {
  //   animationRef.current?.play();
  // }, []);

  return (
    <LinearGradient
      colors={['#f8f9fa', '#ffffff']}
      style={styles.gradientContainer}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Skip Button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Onboarding'i atla"
          accessibilityHint="Direkt giriş ekranına gitmek için dokunun"
        >
          <Text style={styles.skipButtonText} allowFontScaling={true}>Geç</Text>
        </TouchableOpacity>

        {/* Animation Area */}
        <View style={styles.animationContainer}>
          {/* Placeholder */}
          <View style={styles.animationPlaceholder}>
            <View style={styles.offerCardsContainer}>
              <View style={[styles.offerCard, styles.offerCard1]}>
                <MaterialIcons name="local-offer" size={32} color="#007bff" />
                <Text style={styles.offerPrice} allowFontScaling={true}>₺250</Text>
              </View>
              <View style={[styles.offerCard, styles.offerCard2]}>
                <MaterialIcons name="local-offer" size={32} color="#28a745" />
                <Text style={styles.offerPrice} allowFontScaling={true}>₺180</Text>
              </View>
              <View style={[styles.offerCard, styles.offerCard3]}>
                <MaterialIcons name="local-offer" size={32} color="#ffc107" />
                <Text style={styles.offerPrice} allowFontScaling={true}>₺200</Text>
              </View>
            </View>
          </View>

          {/* Uncomment when Lottie is installed:
          <LottieView
            ref={animationRef}
            source={require('../../assets/animations/incoming-offers.json')}
            autoPlay
            loop
            style={styles.animation}
          />
          */}
        </View>

        {/* Content Area */}
        <View style={styles.contentContainer}>
          <Text style={styles.heading} allowFontScaling={true}>Teklifler Al</Text>
          <Text style={styles.description} allowFontScaling={true}>
            Sağlayıcılar size özel tekliflerle yarışsın!
          </Text>

          {/* Features List */}
          <View style={styles.featuresList}>
            <FeatureItem
              emoji="⭐"
              text="Doğrulanmış satıcılar"
            />
            <FeatureItem
              emoji="💬"
              text="Anlık mesajlaşma"
            />
            <FeatureItem
              emoji="📊"
              text="Fiyat karşılaştır"
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Pagination Dots */}
          <View style={styles.paginationContainer}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
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
              style={styles.nextButton}
              onPress={onNext}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Devam et"
              accessibilityHint="Son onboarding slaytına geçmek için dokunun"
            >
              <Text style={styles.nextButtonText} allowFontScaling={true}>Devam Et</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

// Feature Item Component with Emoji
interface FeatureItemProps {
  emoji: string;
  text: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ emoji, text }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureEmoji} allowFontScaling={true}>{emoji}</Text>
    <Text style={styles.featureText} allowFontScaling={true}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
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
  offerCardsContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offerCard: {
    position: 'absolute',
    width: 140,
    height: 100,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    gap: 8,
  },
  offerCard1: {
    top: 40,
    left: 20,
    transform: [{ rotate: '-8deg' }],
  },
  offerCard2: {
    top: 80,
    right: 20,
    transform: [{ rotate: '8deg' }],
  },
  offerCard3: {
    bottom: 60,
    zIndex: 1,
  },
  offerPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
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
  nextButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#007bff',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 20,
  },
});

export default OnboardingSlide2;