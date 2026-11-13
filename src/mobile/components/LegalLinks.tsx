import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { openWebPage, WebPage } from '../utils/webLinks';

const LINKS: { page: WebPage; label: string }[] = [
  { page: 'privacy', label: 'Gizlilik Politikası' },
  { page: 'terms', label: 'Kullanım Koşulları' },
  { page: 'kvkk', label: 'KVKK Aydınlatma Metni' },
  { page: 'contact', label: 'İletişim' },
];

interface LegalLinksProps {
  style?: StyleProp<ViewStyle>;
}

// Compact row of legal/contact links that open the web pages in an in-app browser
const LegalLinks: React.FC<LegalLinksProps> = ({ style }) => (
  <View style={[styles.container, style]}>
    {LINKS.map(({ page, label }) => (
      <TouchableOpacity
        key={page}
        onPress={() => openWebPage(page)}
        accessibilityRole="link"
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <Text style={styles.link}>{label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

// "Kayıt olarak ... kabul etmiş olursunuz." consent line with tappable terms/privacy links
export const RegisterConsentText: React.FC<{ style?: StyleProp<TextStyle> }> = ({ style }) => (
  <Text style={[styles.consent, style]}>
    Kayıt olarak{' '}
    <Text style={styles.consentLink} accessibilityRole="link" onPress={() => openWebPage('terms')}>
      Kullanım Koşulları
    </Text>
    {"'nı ve "}
    <Text style={styles.consentLink} accessibilityRole="link" onPress={() => openWebPage('privacy')}>
      Gizlilik Politikası
    </Text>
    {"'nı kabul etmiş olursunuz."}
  </Text>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 16,
    rowGap: 8,
  },
  link: {
    color: '#666',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  consent: {
    color: '#666',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  consentLink: {
    color: '#007bff',
    fontWeight: '600',
  },
});

export default LegalLinks;
