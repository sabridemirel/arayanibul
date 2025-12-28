import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Input, Button, Divider, GuestAccessModal } from '../components/ui';
import { useForm } from '../hooks/useForm';
import { LoginData } from '../services/api';

interface Props {
  navigation: any;
}

interface LoginFormData extends LoginData {}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, googleLogin, facebookLogin, guestContinue, isLoading } = useAuth();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateLogin = (values: LoginFormData) => {
    const errors: Partial<Record<keyof LoginFormData, string>> = {};

    if (!values.email?.trim()) {
      errors.email = 'E-posta adresi gereklidir';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      errors.email = 'Geçerli bir e-posta adresi girin';
    }

    if (!values.password?.trim()) {
      errors.password = 'Şifre gereklidir';
    } else if (values.password.length < 6) {
      errors.password = 'Şifre en az 6 karakter olmalıdır';
    }

    return errors;
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldTouched,
    handleSubmit,
  } = useForm<LoginFormData>({
    initialValues: { email: '', password: '' },
    validate: validateLogin,
    onSubmit: async (formValues) => {
      try {
        setError(null);
        await login({
          email: formValues.email.trim(),
          password: formValues.password
        });
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        navigation.goBack();
      } catch (error: any) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
        setError(error.message || 'Giriş sırasında bir hata oluştu');
      }
    },
  });

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      await googleLogin();
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      navigation.goBack();
    } catch (error: any) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setError(error.message || 'Google ile giriş sırasında bir hata oluştu');
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setError(null);
      await facebookLogin();
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      navigation.goBack();
    } catch (error: any) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setError(error.message || 'Facebook ile giriş sırasında bir hata oluştu');
    }
  };

  const handleGuestLogin = async () => {
    try {
      setError(null);
      setShowGuestModal(false);
      await guestContinue();
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      navigation.goBack();
    } catch (error: any) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      setError(error.message || 'Misafir girişi sırasında bir hata oluştu');
    }
  };

  const handleShowGuestModal = () => {
    setShowGuestModal(true);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Image
            source={require('../assets/images/logo.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Hoş Geldiniz</Text>
          <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>
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

        <View style={styles.form}>
          <Input
            placeholder="E-posta"
            value={values.email}
            onChangeText={(text) => setValue('email', text)}
            onBlur={() => setFieldTouched('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="email"
            error={touched.email ? errors.email : undefined}
          />

          <Input
            placeholder="Şifre"
            value={values.password}
            onChangeText={(text) => setValue('password', text)}
            onBlur={() => setFieldTouched('password')}
            secureTextEntry={true}
            autoCapitalize="none"
            leftIcon="lock"
            showPasswordToggle={true}
            error={touched.password ? errors.password : undefined}
          />

          <Button
            title="Giriş Yap"
            onPress={handleSubmit}
            disabled={isLoading || isSubmitting}
            loading={isLoading || isSubmitting}
            fullWidth
            style={styles.loginButton}
          />

          <Divider text="veya" />

          <Button
            title="Google ile Giriş"
            onPress={handleGoogleLogin}
            disabled={isLoading || isSubmitting}
            variant="secondary"
            icon="login"
            fullWidth
            style={[styles.socialButton, { backgroundColor: '#db4437', borderColor: '#db4437' }]}
          />

          <Button
            title="Facebook ile Giriş"
            onPress={handleFacebookLogin}
            disabled={isLoading || isSubmitting}
            variant="secondary"
            icon="login"
            fullWidth
            style={[styles.socialButton, { backgroundColor: '#4267B2', borderColor: '#4267B2' }]}
          />

          <Button
            title="Misafir Olarak Devam Et"
            onPress={handleShowGuestModal}
            disabled={isLoading || isSubmitting}
            variant="outline"
            icon="person-outline"
            fullWidth
            style={styles.socialButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Hesabınız yok mu? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <GuestAccessModal
        visible={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        onContinueAsGuest={handleGuestLogin}
        onLogin={() => {
          setShowGuestModal(false);
          // Already on login screen
        }}
        onRegister={() => {
          setShowGuestModal(false);
          navigation.navigate('Register');
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
    borderRadius: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
  form: {
    marginBottom: 30,
  },
  loginButton: {
    marginBottom: 20,
  },
  socialButton: {
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  linkText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LoginScreen;