import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Button } from '../components/ui';
import authService from '../services/authService';

interface Props {
  navigation: any;
  route: any;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const [email, setEmail] = useState(route?.params?.email ?? '');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError('E-posta adresi gereklidir');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setFieldError('Geçerli bir e-posta adresi girin');
      return;
    }

    setFieldError(undefined);
    setError(null);
    setSubmitting(true);
    try {
      // The server answers the same way whether or not the address is registered
      const message = await authService.forgotPassword(trimmed);
      setSentMessage(message);
    } catch (err: any) {
      setError(err.message || 'İstek gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Geri git"
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialIcons name={sentMessage ? 'mark-email-read' : 'lock-reset'} size={36} color="#7B2CBF" />
            </View>
            <Text style={styles.title}>Şifremi Unuttum</Text>
            <Text style={styles.subtitle}>
              {sentMessage
                ? sentMessage
                : 'Hesabınıza kayıtlı e-posta adresini girin. Şifrenizi sıfırlamanız için size bir bağlantı göndereceğiz.'}
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="error-outline" size={20} color="#fff" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => setError(null)}>
                <MaterialIcons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {sentMessage ? (
            <>
              <Text style={styles.hint}>
                E-postayı göremiyorsanız gereksiz (spam) klasörünü kontrol edin. Bağlantı, şifrenizi web sitemizde yenilemenizi sağlar.
              </Text>
              <Button title="Girişe Dön" onPress={() => navigation.goBack()} fullWidth />
            </>
          ) : (
            <>
              <Input
                placeholder="E-posta"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (fieldError) setFieldError(undefined);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon="email"
                error={fieldError}
              />
              <Button
                title="Sıfırlama Bağlantısı Gönder"
                onPress={handleSubmit}
                disabled={submitting}
                loading={submitting}
                fullWidth
                style={styles.submitButton}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e7f1ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    lineHeight: 19,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 8,
  },
});

export default ForgotPasswordScreen;
