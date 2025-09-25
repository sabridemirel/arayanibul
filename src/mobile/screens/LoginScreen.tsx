import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { Input, Button, Divider, ErrorMessage, GuestAccessModal } from '../components/ui';
import { useForm } from '../hooks/useForm';
import { LoginData } from '../services/api';

interface Props {
  navigation: any;
}

interface LoginFormData extends LoginData {}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, googleLogin, facebookLogin, guestContinue, isLoading } = useAuth();
  const [showGuestModal, setShowGuestModal] = useState(false);

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
        await login({ 
          email: formValues.email.trim(), 
          password: formValues.password 
        });
        Alert.alert('Başarılı', 'Giriş başarılı!');
      } catch (error: any) {
        Alert.alert('Hata', error.message);
      }
    },
  });

  const handleGoogleLogin = async () => {
    try {
      await googleLogin();
      Alert.alert('Başarılı', 'Google ile giriş başarılı!');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      await facebookLogin();
      Alert.alert('Başarılı', 'Facebook ile giriş başarılı!');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleGuestLogin = async () => {
    try {
      setShowGuestModal(false);
      await guestContinue();
      Alert.alert('Başarılı', 'Misafir girişi başarılı!');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
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