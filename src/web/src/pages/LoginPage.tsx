import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EnvelopeIcon, LockClosedIcon, UserIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from '../hooks/useForm';
import { Button, Input, Card, Divider, ErrorMessage } from '../components/ui';

interface LoginFormValues {
  email: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, guestContinue, isAuthenticated, isLoading, error, clearError } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const validate = (values: LoginFormValues) => {
    const errors: Partial<Record<keyof LoginFormValues, string>> = {};

    if (!values.email) {
      errors.email = 'E-posta adresi gereklidir';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.email = 'Gecerli bir e-posta adresi giriniz';
    }

    if (!values.password) {
      errors.password = 'Sifre gereklidir';
    } else if (values.password.length < 6) {
      errors.password = 'Sifre en az 6 karakter olmalidir';
    }

    return errors;
  };

  const { values, errors, isSubmitting, handleChange, handleBlur, handleSubmit, touched } = useForm<LoginFormValues>({
    initialValues: {
      email: '',
      password: '',
    },
    validate,
    onSubmit: async (formValues) => {
      try {
        await login(formValues);
        navigate('/');
      } catch {
        // Error handled by AuthContext
      }
    },
  });

  const handleGuestContinue = async () => {
    try {
      await guestContinue();
      navigate('/');
    } catch {
      // Error handled by AuthContext
    }
  };

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
          <h1 className="mt-4 text-2xl font-bold text-text">Giris Yap</h1>
          <p className="mt-2 text-text-secondary">
            Hesabiniza giris yaparak ilanlari inceleyin
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
              placeholder="Sifrenizi giriniz"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.password ? errors.password : undefined}
              leftIcon={<LockClosedIcon className="h-5 w-5" />}
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                />
                <span className="text-sm text-text-secondary">Beni Hatirla</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:text-primary-dark transition-colors"
              >
                Sifremi Unuttum
              </Link>
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting || isLoading}
            >
              Giris Yap
            </Button>
          </form>

          <Divider text="veya" className="my-6" />

          <Button
            type="button"
            variant="outline"
            fullWidth
            leftIcon={<UserIcon className="h-5 w-5" />}
            onClick={handleGuestContinue}
            isLoading={isLoading}
          >
            Misafir Olarak Devam Et
          </Button>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Hesabiniz yok mu?{' '}
            <Link
              to="/register"
              className="text-primary hover:text-primary-dark font-medium transition-colors"
            >
              Kayit Olun
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
