// OnboardingScreen.tsx
import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingSlide1 from './onboarding/OnboardingSlide1';
import OnboardingSlide2 from './onboarding/OnboardingSlide2';
import OnboardingSlide3 from './onboarding/OnboardingSlide3';

interface OnboardingScreenProps {
  navigation?: any;
  onComplete?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_COMPLETED_KEY = '@arayanibul_onboarding_completed';

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Mark onboarding as completed
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');

      // Use onComplete callback if provided (from App.tsx), otherwise use navigation
      if (onComplete) {
        onComplete();
      } else if (navigation) {
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error saving onboarding state:', error);
      if (onComplete) {
        onComplete();
      } else if (navigation) {
        navigation.replace('Login');
      }
    }
  };

  // Navigation handlers
  const goToSlide = (index: number) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true });
    }
  };

  const handleNext = () => {
    if (currentIndex < 2) {
      goToSlide(currentIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      goToSlide(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const handleGetStarted = () => {
    completeOnboarding();
  };

  // Track scroll position
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const index = viewableItems[0].index ?? 0;
        setCurrentIndex(index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // Slide data
  const slides = [
    { id: '1', component: OnboardingSlide1 },
    { id: '2', component: OnboardingSlide2 },
    { id: '3', component: OnboardingSlide3 },
  ];

  const renderItem = ({ item, index }: { item: typeof slides[0]; index: number }) => {
    const Component = item.component;

    if (index === 0) {
      return (
        <View style={styles.slide}>
          <Component onNext={handleNext} onSkip={handleSkip} />
        </View>
      );
    } else if (index === 1) {
      return (
        <View style={styles.slide}>
          <Component
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        </View>
      );
    } else {
      return (
        <View style={styles.slide}>
          <Component
            onGetStarted={handleGetStarted}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        decelerationRate="fast"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});

export default OnboardingScreen;

// Helper function to check if onboarding is completed
export const checkOnboardingStatus = async (): Promise<boolean> => {
  try {
    const completed = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return completed === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
};

// Helper function to reset onboarding (for testing)
export const resetOnboarding = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
};