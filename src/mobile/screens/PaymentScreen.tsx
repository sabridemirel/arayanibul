import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { WebView } from 'react-native-webview';
import { paymentAPI, cardUtils } from '../services/paymentService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import { colors, spacing, typography } from '../theme';
import { RootStackParamList } from '../types';

type PaymentScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Payment'>;
type PaymentScreenRouteProp = RouteProp<RootStackParamList, 'Payment'>;

const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<PaymentScreenNavigationProp>();
  const route = useRoute<PaymentScreenRouteProp>();
  const { offerId } = route.params;

  const [submitting, setSubmitting] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [threeDSecureUrl, setThreeDSecureUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);

  // Form state
  const [cardNumber, setCardNumber] = useState('');
  const [cvv, setCvv] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');

  // Form validation errors
  const [errors, setErrors] = useState<{
    cardNumber?: string;
    cvv?: string;
    expiryDate?: string;
    cardHolderName?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Card number validation
    const cleanedCard = cardUtils.cleanCardNumber(cardNumber);
    if (!cleanedCard) {
      newErrors.cardNumber = 'Kart numarası gereklidir';
    } else if (cleanedCard.length !== 16) {
      newErrors.cardNumber = 'Kart numarası 16 haneli olmalıdır';
    } else if (!cardUtils.validateCardNumber(cleanedCard)) {
      newErrors.cardNumber = 'Geçersiz kart numarası';
    }

    // CVV validation
    if (!cvv) {
      newErrors.cvv = 'CVV gereklidir';
    } else if (!cardUtils.validateCVV(cvv)) {
      newErrors.cvv = 'CVV 3-4 haneli olmalıdır';
    }

    // Expiry date validation
    const parsedExpiry = cardUtils.parseExpiryDate(expiryDate);
    if (!expiryDate) {
      newErrors.expiryDate = 'Son kullanma tarihi gereklidir';
    } else if (!parsedExpiry) {
      newErrors.expiryDate = 'Geçersiz tarih formatı (AA/YY)';
    } else if (!cardUtils.validateExpiryDate(parsedExpiry.month, parsedExpiry.year)) {
      newErrors.expiryDate = 'Kartın süresi dolmuş';
    }

    // Cardholder name validation
    if (!cardHolderName.trim()) {
      newErrors.cardHolderName = 'Kart sahibinin adı gereklidir';
    } else if (!cardUtils.validateCardHolderName(cardHolderName)) {
      newErrors.cardHolderName = 'Geçerli bir isim giriniz (en az 3 karakter)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCardNumberChange = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    if (cleaned.length <= 16 && /^\d*$/.test(cleaned)) {
      setCardNumber(cardUtils.formatCardNumber(cleaned));
      if (errors.cardNumber) {
        setErrors({ ...errors, cardNumber: undefined });
      }
    }
  };

  const handleCvvChange = (text: string) => {
    if (text.length <= 4 && /^\d*$/.test(text)) {
      setCvv(text);
      if (errors.cvv) {
        setErrors({ ...errors, cvv: undefined });
      }
    }
  };

  const handleExpiryDateChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 4) {
      setExpiryDate(cardUtils.formatExpiryDate(cleaned));
      if (errors.expiryDate) {
        setErrors({ ...errors, expiryDate: undefined });
      }
    }
  };

  const handleCardHolderNameChange = (text: string) => {
    setCardHolderName(text);
    if (errors.cardHolderName) {
      setErrors({ ...errors, cardHolderName: undefined });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const parsedExpiry = cardUtils.parseExpiryDate(expiryDate);
      if (!parsedExpiry) {
        Alert.alert('Hata', 'Geçersiz son kullanma tarihi');
        return;
      }

      const response = await paymentAPI.initializePayment({
        offerId,
        cardNumber: cardUtils.cleanCardNumber(cardNumber),
        cvv,
        expiryMonth: parsedExpiry.month,
        expiryYear: parsedExpiry.year,
        cardHolderName: cardHolderName.trim(),
      });

      if (response.success && response.threeDSecureUrl) {
        // 3D Secure required, open WebView
        setThreeDSecureUrl(response.threeDSecureUrl);
        setPaymentId(response.paymentId || null);
        setShowWebView(true);
      } else if (response.success) {
        // Payment successful without 3D Secure
        showSuccessAndNavigate();
      } else {
        Alert.alert('Ödeme Başarısız', response.message || 'Ödeme işlemi başarısız oldu');
      }
    } catch (err: any) {
      Alert.alert(
        'Hata',
        err.response?.data?.message || 'Ödeme başlatılırken hata oluştu'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleWebViewNavigationStateChange = async (navState: any) => {
    const { url } = navState;

    // Check if callback URL is detected
    if (url.startsWith('arayanibul://payment-callback')) {
      setShowWebView(false);

      try {
        // Parse URL to extract paymentId and status
        const urlObj = new URL(url);
        const urlPaymentId = urlObj.searchParams.get('paymentId');
        const status = urlObj.searchParams.get('status');

        if (!urlPaymentId || !status) {
          Alert.alert('Hata', 'Ödeme durumu alınamadı');
          return;
        }

        // Verify payment with backend
        const response = await paymentAPI.verifyPaymentCallback(
          parseInt(urlPaymentId, 10),
          status
        );

        if (response.success) {
          showSuccessAndNavigate();
        } else {
          Alert.alert('Ödeme Başarısız', response.message || 'Ödeme doğrulaması başarısız');
        }
      } catch (err: any) {
        Alert.alert(
          'Hata',
          err.response?.data?.message || 'Ödeme doğrulanırken hata oluştu'
        );
      }
    }
  };

  const showSuccessAndNavigate = () => {
    Alert.alert(
      'Ödeme Başarılı',
      'Ödemeniz başarıyla tamamlandı!',
      [
        {
          text: 'Tamam',
          onPress: () => navigation.navigate('MyOffers'),
        },
      ]
    );
  };

  const closeWebView = () => {
    setShowWebView(false);
    Alert.alert('İptal', 'Ödeme işlemi iptal edildi');
  };

  if (submitting) {
    return <Loading message="Ödeme işleniyor..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={styles.card}>
            <View style={styles.header}>
              <MaterialIcons name="payment" size={32} color={colors.primary} />
              <Text style={styles.title} allowFontScaling={true}>Ödeme Bilgileri</Text>
            </View>

            {/* Card Number */}
            <View style={styles.inputContainer}>
              <Text style={styles.label} allowFontScaling={true}>Kart Numarası</Text>
              <TextInput
                style={[styles.input, errors.cardNumber && styles.inputError]}
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                keyboardType="numeric"
                maxLength={19} // 16 digits + 3 spaces
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Kart numarası"
                accessibilityHint="Kredi kartı numaranızı girin"
                allowFontScaling={true}
              />
              {errors.cardNumber && (
                <Text style={styles.errorText} allowFontScaling={true} accessibilityLiveRegion="polite" accessibilityRole="alert">
                  {errors.cardNumber}
                </Text>
              )}
            </View>

            {/* Expiry Date and CVV */}
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label} allowFontScaling={true}>Son Kullanma (AA/YY)</Text>
                <TextInput
                  style={[styles.input, errors.expiryDate && styles.inputError]}
                  value={expiryDate}
                  onChangeText={handleExpiryDateChange}
                  placeholder="12/25"
                  keyboardType="numeric"
                  maxLength={5}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Son kullanma tarihi"
                  accessibilityHint="Kart son kullanma tarihini ay yıl formatında girin"
                  allowFontScaling={true}
                />
                {errors.expiryDate && (
                  <Text style={styles.errorText} allowFontScaling={true} accessibilityLiveRegion="polite" accessibilityRole="alert">
                    {errors.expiryDate}
                  </Text>
                )}
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label} allowFontScaling={true}>CVV</Text>
                <TextInput
                  style={[styles.input, errors.cvv && styles.inputError]}
                  value={cvv}
                  onChangeText={handleCvvChange}
                  placeholder="123"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="CVV güvenlik kodu"
                  accessibilityHint="Kartınızın arkasındaki 3 veya 4 haneli güvenlik kodunu girin"
                  allowFontScaling={true}
                />
                {errors.cvv && (
                  <Text style={styles.errorText} allowFontScaling={true} accessibilityLiveRegion="polite" accessibilityRole="alert">
                    {errors.cvv}
                  </Text>
                )}
              </View>
            </View>

            {/* Cardholder Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label} allowFontScaling={true}>Kart Sahibinin Adı</Text>
              <TextInput
                style={[styles.input, errors.cardHolderName && styles.inputError]}
                value={cardHolderName}
                onChangeText={handleCardHolderNameChange}
                placeholder="AD SOYAD"
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel="Kart sahibinin adı"
                accessibilityHint="Kart üzerinde yazan adı soyadı girin"
                allowFontScaling={true}
              />
              {errors.cardHolderName && (
                <Text style={styles.errorText} allowFontScaling={true} accessibilityLiveRegion="polite" accessibilityRole="alert">
                  {errors.cardHolderName}
                </Text>
              )}
            </View>

            {/* Security Note */}
            <View style={styles.securityNote}>
              <MaterialIcons name="lock" size={16} color={colors.textSecondary} />
              <Text style={styles.securityText} allowFontScaling={true}>
                Ödeme bilgileriniz güvenli bir şekilde şifrelenir
              </Text>
            </View>

            {/* Submit Button */}
            <Button
              title="Ödemeyi Tamamla"
              onPress={handleSubmit}
              disabled={submitting}
              loading={submitting}
            />

            {/* Cancel Button */}
            <Button
              title="İptal"
              onPress={() => navigation.goBack()}
              variant="outline"
              style={styles.cancelButton}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 3D Secure WebView Modal */}
      <Modal
        visible={showWebView}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeWebView}
      >
        <SafeAreaView style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>3D Secure Doğrulama</Text>
            <Button
              title="İptal"
              onPress={closeWebView}
              variant="outline"
              style={styles.webViewCloseButton}
            />
          </View>
          {threeDSecureUrl && (
            <WebView
              source={{ uri: threeDSecureUrl }}
              onNavigationStateChange={handleWebViewNavigationStateChange}
              style={styles.webView}
              startInLoadingState
              renderLoading={() => <Loading message="Yükleniyor..." />}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  card: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.sm,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  securityText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  webViewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  webViewCloseButton: {
    minWidth: 80,
  },
  webView: {
    flex: 1,
  },
});

export default PaymentScreen;