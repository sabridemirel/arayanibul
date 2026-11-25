import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { colors } from '../../../theme';
import OnboardingLayout from './OnboardingLayout';

interface OnboardingSlide1Props {
  onNext: () => void;
  onSkip: () => void;
}

const OnboardingSlide1: React.FC<OnboardingSlide1Props> = ({ onNext, onSkip }) => (
  <OnboardingLayout
    illustration={
      <View style={styles.disc}>
        <Image
          source={require('../../../assets/images/mascot.png')}
          style={styles.mascot}
          resizeMode="contain"
          accessibilityLabel="Arayanibul maskotu"
        />
      </View>
    }
    title="Aradığınızı paylaşın"
    description="Ne aradığınızı yazın, satıcılar size teklif versin."
    features={['Ücretsiz ilan verin', 'Kategori ve bütçenizi seçin', 'İlanınız hemen yayına girer']}
    step={1}
    totalSteps={2}
    primaryLabel="Devam Et"
    onPrimary={onNext}
    onSkip={onSkip}
  />
);

const styles = StyleSheet.create({
  disc: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.secondaryOrange,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  mascot: { width: 200, height: 250, marginBottom: -30 },
});

export default OnboardingSlide1;
