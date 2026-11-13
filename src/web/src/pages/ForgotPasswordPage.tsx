import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { authAPI } from '../services/api';
import { Button, Input, ErrorMessage } from '../components/ui';
import AuthShell from '../components/auth/AuthShell';

const SUCCESS_MESSAGE =
  'Bu e-posta adresiyle kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu ve gereksiz klasörünü kontrol edin.';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = (value: string): string | undefined => {
    if (!value) return 'E-posta adresi gereklidir';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Geçerli bir e-posta adresi giriniz';
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim();
    const validationError = validate(trimmed);
    setEmailError(validationError);
    if (validationError) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await authAPI.forgotPassword(trimmed);
      setSent(true);
    } catch {
      setError('İstek gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Şifremi Unuttum"
      subtitle="E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim"
    >
      {sent ? (
        <div className="text-center">
          <CheckCircleIcon className="h-14 w-14 text-success mx-auto mb-4" />
          <p className="text-text mb-6">{SUCCESS_MESSAGE}</p>
          <Link
            to="/login"
            className="text-primary hover:text-primary-dark font-medium transition-colors"
          >
            Giriş Sayfasına Dön
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <ErrorMessage message={error} onDismiss={() => setError(null)} className="mb-4" />
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="E-posta Adresi"
              type="email"
              name="email"
              placeholder="ornek@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(undefined);
              }}
              error={emailError}
              leftIcon={<EnvelopeIcon className="h-5 w-5" />}
              autoComplete="email"
              autoFocus
            />

            <Button type="submit" fullWidth isLoading={isSubmitting}>
              Sıfırlama Bağlantısı Gönder
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Şifrenizi hatırladınız mı?{' '}
            <Link
              to="/login"
              className="text-primary hover:text-primary-dark font-medium transition-colors"
            >
              Giriş Yapın
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
};

export default ForgotPasswordPage;
