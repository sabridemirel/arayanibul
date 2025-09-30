// OnboardingSlide1.tsx
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
// import LottieView from 'lottie-react-native'; // Install: npx expo install lottie-react-native

interface OnboardingSlide1Props {
  onNext: () => void;
  onSkip: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ANIMATION_HEIGHT = SCREEN_HEIGHT * 0.4;

const OnboardingSlide1: React.FC<OnboardingSlide1Props> = ({ onNext, onSkip }) => {
  // Uncomment when Lottie is installed
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
        accessibilityLabel="Onboarding'i atla"
        accessibilityHint="Direkt giriş ekranına gitmek için dokunun"
      >
        <Text style={styles.skipButtonText} allowFontScaling={true}>Geç</Text>
      </TouchableOpacity>

      {/* Animation Area */}
      <View style={styles.animationContainer}>
        {/* Placeholder - Replace with LottieView when installed */}
        <View style={styles.animationPlaceholder}>
          <MaterialIcons name="edit-note" size={120} color="#007bff" />
        </View>

        {/* Uncomment when Lottie is installed:
        <LottieView
          ref={animationRef}
          source={require('../../assets/animations/create-post.json')}
          autoPlay
          loop
          style={styles.animation}
        />
        */}
      </View>

      {/* Content Area */}
      <View style={styles.contentContainer}>
        <Text style={styles.heading} allowFontScaling={true}>Aradığını Paylaş</Text>
        <Text style={styles.description} allowFontScaling={true}>
          İhtiyacını yaz, teklifler gelsin. Alıcı sensin!
        </Text>

        {/* Features List */}
        <View style={styles.featuresList}>
          <FeatureItem
            icon="check-circle"
            text="Hızlı ilan oluştur"
          />
          <FeatureItem
            icon="check-circle"
            text="Kategorini seç"
          />
          <FeatureItem
            icon="check-circle"
            text="Bütçeni belirle"
          />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.paginationContainer}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Next Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={onNext}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Devam et"
          accessibilityHint="Sonraki onboarding slaytına geçmek için dokunun"
        >
          <Text style={styles.nextButtonText} allowFontScaling={true}>Devam Et</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// Feature Item Component
interface FeatureItemProps {
  icon: string;
  text: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <MaterialIcons name={icon as any} size={20} color="#28a745" />
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
    backgroundColor: '#f8f9fa',
    borderRadius: 150,
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
  featureText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#333333',
    lineHeight: 22,
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

  // Next Button
  nextButton: {
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

export default OnboardingSlide1;