import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  EnvelopeIcon,
  LockClosedIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from '../hooks/useForm';
import { Button, Input, Card, ErrorMessage } from '../components/ui';

interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, isGuest, isLoading, error, clearError } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      navigate('/');
    }
  }, [isAuthenticated, isGuest, navigate]);

  const validate = (values: RegisterFormValues) => {
    const errors: Partial<Record<keyof RegisterFormValues, string>> = {};

    if (!values.firstName) {
      errors.firstName = 'Ad gereklidir';
    } else if (values.firstName.length < 2) {
      errors.firstName = 'Ad en az 2 karakter olmalıdır';
    }

    if (!values.lastName) {
      errors.lastName = 'Soyad gereklidir';
    } else if (values.lastName.length < 2) {
      errors.lastName = 'Soyad en az 2 karakter olmalıdır';
    }

    if (!values.email) {
      errors.email = 'E-posta adresi gereklidir';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.email = 'Geçerli bir e-posta adresi giriniz';
    }

    if (!values.password) {
      errors.password = 'Şifre gereklidir';
    } else if (values.password.length < 6) {
      errors.password = 'Şifre en az 6 karakter olmalıdır';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(values.password)) {
      errors.password = 'Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir';
    }

    if (!values.confirmPassword) {
      errors.confirmPassword = 'Şifre tekrarı gereklidir';
    } else if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Şifreler eşleşmiyor';
    }

    return errors;
  };

  const { values, errors, isSubmitting, handleChange, handleBlur, handleSubmit, touched } = useForm<RegisterFormValues>({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate,
    onSubmit: async (formValues) => {
      try {
        await register({
          firstName: formValues.firstName,
          lastName: formValues.lastName,
          email: formValues.email,
          password: formValues.password,
        });
        navigate('/');
      } catch {
        // Error handled by AuthContext
      }
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#5A189A] via-[#7B2CBF] to-[#3c0764] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <img
              src="/assets/mascot.png"
              alt="Arayanibul Maskot"
              className="h-20 w-20 object-contain mx-auto"
            />
            <span className="text-2xl font-extrabold">
              <span className="text-white">Arayanı</span>
              <span className="text-[#F59E0B]">BUL</span>
            </span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-white">Kayıt Ol</h1>
          <p className="mt-2 text-white/70">
            Hesap oluşturun ve ilanlara göz atın
          </p>
        </div>

        <Card padding="lg" className="!bg-white/95 backdrop-blur-sm !shadow-2xl shadow-purple-900/50">
          {isGuest && (
            <p className="mb-4 rounded-lg bg-purple-50 px-4 py-3 text-sm text-purple-900">
              Misafir olarak yalnızca ilanları görüntüleyebilirsiniz. İlan vermek, teklif vermek ve
              mesajlaşmak için ücretsiz hesap oluşturun.
            </p>
          )}

          {/* Error Message */}
          {error && (
            <ErrorMessage
              message={error}
              onDismiss={clearError}
              className="mb-4"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Ad"
                type="text"
                name="firstName"
                placeholder="Adınız"
                value={values.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.firstName ? errors.firstName : undefined}
                leftIcon={<UserIcon className="h-5 w-5" />}
                autoComplete="given-name"
              />

              <Input
                label="Soyad"
                type="text"
                name="lastName"
                placeholder="Soyadınız"
                value={values.lastName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.lastName ? errors.lastName : undefined}
                autoComplete="family-name"
              />
            </div>

            <Input
              label="E-posta Adresi"
              type="email"
              name="email"
              placeholder="ornek@email.com"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.email ? errors.email : undefined}
              leftIcon={<EnvelopeIcon className="h-5 w-5" />}
              autoComplete="email"
            />

            <Input
              label="Şifre"
              type="password"
              name="password"
              placeholder="En az 6 karakter"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.password ? errors.password : undefined}
              leftIcon={<LockClosedIcon className="h-5 w-5" />}
              autoComplete="new-password"
            />

            <Input
              label="Şifre Tekrarı"
              type="password"
              name="confirmPassword"
              placeholder="Şifrenizi tekrar giriniz"
              value={values.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.confirmPassword ? errors.confirmPassword : undefined}
              leftIcon={<LockClosedIcon className="h-5 w-5" />}
              autoComplete="new-password"
            />

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-primary"
                required
              />
              <label htmlFor="terms" className="text-sm text-text-secondary">
                <Link to="/terms" target="_blank" className="text-primary hover:text-primary-dark">
                  Kullanım Koşulları
                </Link>
                'nı ve{' '}
                <Link to="/privacy" target="_blank" className="text-primary hover:text-primary-dark">
                  Gizlilik Politikası
                </Link>
                'nı okudum, kabul ediyorum.{' '}
                <Link to="/kvkk" target="_blank" className="text-primary hover:text-primary-dark">
                  KVKK Aydınlatma Metni
                </Link>
                'ni okudum.
              </label>
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting || isLoading}
            >
              Kayıt Ol
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Zaten hesabınız var mı?{' '}
            <Link
              to="/login"
              className="text-primary hover:text-primary-dark font-medium transition-colors"
            >
              Giriş Yapın
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
