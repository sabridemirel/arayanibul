import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../../theme';
import { fonts } from '../../../theme/fonts';
import OnboardingLayout from './OnboardingLayout';

interface OnboardingSlide2Props {
  onGetStarted: () => void;
  onBack: () => void;
  onSkip: () => void;
}

// Three incoming offers fanned out like cards on a table
const OFFERS = [
  { price: '₺250', days: '3 gün', tilt: '-7deg', x: -78, y: -62, tag: colors.primary },
  { price: '₺180', days: '2 gün', tilt: '6deg', x: 78, y: -30, tag: colors.secondaryOrange },
  { price: '₺200', days: '1 gün', tilt: '-2deg', x: -10, y: 74, tag: colors.primaryDark },
];

const OnboardingSlide2: React.FC<OnboardingSlide2Props> = ({ onGetStarted, onBack, onSkip }) => (
  <OnboardingLayout
    illustration={
      <View style={styles.stage} accessibilityLabel="Gelen teklif kartları" accessible>
        {OFFERS.map(offer => (
          <View
            key={offer.price}
            style={[styles.card, { transform: [{ translateX: offer.x }, { translateY: offer.y }, { rotate: offer.tilt }] }]}
          >
            <MaterialIcons name="local-offer" size={22} color={offer.tag} />
            <Text style={styles.price}>{offer.price}</Text>
            <Text style={styles.days}>{offer.days} içinde teslim</Text>
          </View>
        ))}
      </View>
    }
    title="Teklifleri karşılaştırın"
    description="Satıcılar ilanınıza teklif gönderir, size uyanı siz seçersiniz."
    features={['Teklif beklerken bile mesajlaşın', 'Fiyat ve teslim süresini karşılaştırın', 'Uygun teklifi tek dokunuşla kabul edin']}
    step={2}
    totalSteps={2}
    primaryLabel="Başla"
    onPrimary={onGetStarted}
    onBack={onBack}
    onSkip={onSkip}
  />
);

const styles = StyleSheet.create({
  stage: { width: 300, height: 260, alignItems: 'center', justifyContent: 'center' },
  card: {
    position: 'absolute',
    width: 150,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    shadowColor: '#2a0a4a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  price: { fontFamily: fonts.display, fontSize: 28, color: colors.text, marginTop: 6 },
  days: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
});

export default OnboardingSlide2;
