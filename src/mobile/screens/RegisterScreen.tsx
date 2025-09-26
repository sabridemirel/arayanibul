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
import { Input, Button, Divider, GuestAccessModal } from '../components/ui';
import { useForm } from '../hooks/useForm';
import { RegisterData } from '../services/api';

interface Props {
  navigation: any;
}

interface RegisterFormData extends RegisterData {
  confirmPassword: string;
}

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { register, googleLogin, facebookLogin, guestContinue, isLoading } = useAuth();
  const [showGuestModal, setShowGuestModal] = useState(false);

  const validateRegister = (values: RegisterFormData) => {
    const errors: Partial<Record<keyof RegisterFormData, string>> = {};

    if (!values.firstName?.trim()) {
      errors.firstName = 'Ad gereklidir';
    } else if (values.firstName.trim().length < 2) {
      errors.firstName = 'Ad en az 2 karakter olmalıdır';
    }

    if (!values.lastName?.trim()) {
      errors.lastName = 'Soyad gereklidir';
    } else if (values.lastName.trim().length < 2) {
      errors.lastName = 'Soyad en az 2 karakter olmalıdır';
    }

    if (!values.email?.trim()) {
      errors.email = 'E-posta adresi gereklidir';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      errors.email = 'Geçerli bir e-posta adresi girin';
    }

    if (!values.password?.trim()) {
      errors.password = 'Şifre gereklidir';
    } else if (values.password.length < 6) {
      errors.password = 'Şifre en az 6 karakter olmalıdır';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(values.password)) {
      errors.password = 'Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir';
    }

    if (!values.confirmPassword?.trim()) {
      errors.confirmPassword = 'Şifre tekrarı gereklidir';
    } else if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Şifreler eşleşmiyor';
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
  } = useForm<RegisterFormData>({
    initialValues: { 
      firstName: '', 
      lastName: '', 
      email: '', 
      password: '', 
      confirmPassword: '' 
    },
    validate: validateRegister,
    onSubmit: async (formValues) => {
      try {
        await register({
          firstName: formValues.firstName.trim(),
          lastName: formValues.lastName.trim(),
          email: formValues.email.trim(),
          password: formValues.password,
        });
        Alert.alert('Başarılı', 'Kayıt başarılı!', [
          {
            text: 'Tamam',
            onPress: () => {
              // AuthContext otomatik navigation yapacak
            }
          }
        ]);
      } catch (error: any) {
        Alert.alert('Hata', error.message);
      }
    },
  });

  const handleGoogleRegister = async () => {
    try {
      await googleLogin();
      Alert.alert('Başarılı', 'Google ile kayıt başarılı!', [
        {
          text: 'Tamam',
          onPress: () => {
            // AuthContext otomatik navigation yapacak
          }
        }
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleFacebookRegister = async () => {
    try {
      await facebookLogin();
      Alert.alert('Başarılı', 'Facebook ile kayıt başarılı!', [
        {
          text: 'Tamam',
          onPress: () => {
            // AuthContext otomatik navigation yapacak
          }
        }
      ]);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  const handleGuestLogin = async () => {
    try {
      setShowGuestModal(false);
      await guestContinue();
      Alert.alert('Başarılı', 'Misafir girişi başarılı!', [
        {
          text: 'Tamam',
          onPress: () => {
            // AuthContext otomatik navigation yapacak
          }
        }
      ]);
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
          <Text style={styles.title}>Hesap Oluştur</Text>
          <Text style={styles.subtitle}>Yeni hesabınızı oluşturun</Text>
        </View>

        <View style={styles.form}>
          <Input
            placeholder="Ad"
            value={values.firstName}
            onChangeText={(text) => setValue('firstName', text)}
            onBlur={() => setFieldTouched('firstName')}
            autoCapitalize="words"
            leftIcon="person"
            error={touched.firstName ? errors.firstName : undefined}
          />

          <Input
            placeholder="Soyad"
            value={values.lastName}
            onChangeText={(text) => setValue('lastName', text)}
            onBlur={() => setFieldTouched('lastName')}
            autoCapitalize="words"
            leftIcon="person"
            error={touched.lastName ? errors.lastName : undefined}
          />

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

          <Input
            placeholder="Şifre Tekrar"
            value={values.confirmPassword}
            onChangeText={(text) => setValue('confirmPassword', text)}
            onBlur={() => setFieldTouched('confirmPassword')}
            secureTextEntry={true}
            autoCapitalize="none"
            leftIcon="lock"
            showPasswordToggle={true}
            error={touched.confirmPassword ? errors.confirmPassword : undefined}
          />

          <Button
            title="Kayıt Ol"
            onPress={handleSubmit}
            disabled={isLoading || isSubmitting}
            loading={isLoading || isSubmitting}
            fullWidth
            style={styles.registerButton}
          />

          <Divider text="veya" />

          <Button
            title="Google ile Kayıt Ol"
            onPress={handleGoogleRegister}
            disabled={isLoading || isSubmitting}
            variant="secondary"
            icon="login"
            fullWidth
            style={[styles.socialButton, { backgroundColor: '#db4437', borderColor: '#db4437' }]}
          />

          <Button
            title="Facebook ile Kayıt Ol"
            onPress={handleFacebookRegister}
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
          <Text style={styles.footerText}>Zaten hesabınız var mı? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <GuestAccessModal
        visible={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        onContinueAsGuest={handleGuestLogin}
        onLogin={() => {
          setShowGuestModal(false);
          navigation.navigate('Login');
        }}
        onRegister={() => {
          setShowGuestModal(false);
          // Already on register screen
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
  registerButton: {
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

export default RegisterScreen;