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
  const { register, isAuthenticated, isLoading, error, clearError } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const validate = (values: RegisterFormValues) => {
    const errors: Partial<Record<keyof RegisterFormValues, string>> = {};

    if (!values.firstName) {
      errors.firstName = 'Ad gereklidir';
    } else if (values.firstName.length < 2) {
      errors.firstName = 'Ad en az 2 karakter olmalidir';
    }

    if (!values.lastName) {
      errors.lastName = 'Soyad gereklidir';
    } else if (values.lastName.length < 2) {
      errors.lastName = 'Soyad en az 2 karakter olmalidir';
    }

    if (!values.email) {
      errors.email = 'E-posta adresi gereklidir';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.email = 'Gecerli bir e-posta adresi giriniz';
    }

    if (!values.password) {
      errors.password = 'Sifre gereklidir';
    } else if (values.password.length < 6) {
      errors.password = 'Sifre en az 6 karakter olmalidir';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(values.password)) {
      errors.password = 'Sifre en az bir buyuk harf, bir kucuk harf ve bir rakam icermelidir';
    }

    if (!values.confirmPassword) {
      errors.confirmPassword = 'Sifre tekrari gereklidir';
    } else if (values.password !== values.confirmPassword) {
      errors.confirmPassword = 'Sifreler eslesmiyor';
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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">A</span>
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-text">Kayit Ol</h1>
          <p className="mt-2 text-text-secondary">
            Hesap olusturun ve ilanlara goz atin
          </p>
        </div>

        <Card padding="lg">
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
                placeholder="Adiniz"
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
                placeholder="Soyadiniz"
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
              label="Sifre"
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
              label="Sifre Tekrari"
              type="password"
              name="confirmPassword"
              placeholder="Sifrenizi tekrar giriniz"
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
                <Link
                  to="/terms"
                  className="text-primary hover:text-primary-dark"
                >
                  Kullanim Kosullarini
                </Link>{' '}
                ve{' '}
                <Link
                  to="/privacy"
                  className="text-primary hover:text-primary-dark"
                >
                  Gizlilik Politikasini
                </Link>{' '}
                okudum ve kabul ediyorum.
              </label>
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting || isLoading}
            >
              Kayit Ol
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Zaten hesabiniz var mi?{' '}
            <Link
              to="/login"
              className="text-primary hover:text-primary-dark font-medium transition-colors"
            >
              Giris Yapin
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
