import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LockClosedIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { authAPI } from '../services/api';
import { Button, Input, ErrorMessage } from '../components/ui';
import AuthShell from '../components/auth/AuthShell';

interface FieldErrors {
  newPassword?: string;
  confirmPassword?: string;
}

// Same rules as RegisterPage
const validatePassword = (password: string, confirm: string): FieldErrors => {
  const errors: FieldErrors = {};
  if (!password) {
    errors.newPassword = 'Şifre gereklidir';
  } else if (password.length < 6) {
    errors.newPassword = 'Şifre en az 6 karakter olmalıdır';
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.newPassword = 'Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir';
  }
  if (!confirm) {
    errors.confirmPassword = 'Şifre tekrarı gereklidir';
  } else if (password !== confirm) {
    errors.confirmPassword = 'Şifreler eşleşmiyor';
  }
  return errors;
};

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  // useSearchParams already URL-decodes the values
  const email = searchParams.get('email') ?? '';
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors = validatePassword(newPassword, confirmPassword);
    setFieldErrors(errors);
    if (errors.newPassword || errors.confirmPassword) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await authAPI.resetPassword({ email, token, newPassword });
      setDone(true);
    } catch (err: unknown) {
      const serverMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(
        serverMessage ||
          'Şifre sıfırlanamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!email || !token) {
    return (
      <AuthShell title="Şifre Sıfırlama">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-14 w-14 text-warning mx-auto mb-4" />
          <p className="text-text mb-6">
            Şifre sıfırlama bağlantısı geçersiz veya eksik. E-postanızdaki bağlantıyı eksiksiz
            açtığınızdan emin olun ya da yeni bir bağlantı isteyin.
          </p>
          <Link
            to="/forgot-password"
            className="text-primary hover:text-primary-dark font-medium transition-colors"
          >
            Yeni Bağlantı İste
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Şifre Sıfırlama">
        <div className="text-center">
          <CheckCircleIcon className="h-14 w-14 text-success mx-auto mb-4" />
          <p className="text-text mb-6">
            Şifreniz değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
          >
            Giriş Yap
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Şifre Sıfırlama" subtitle="Hesabınız için yeni bir şifre belirleyin">
      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} className="mb-4" />
      )}

      <p className="text-sm text-text-secondary mb-4">
        Hesap: <span className="font-medium text-text break-all">{email}</span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Yeni Şifre"
          type="password"
          name="newPassword"
          placeholder="En az 6 karakter"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={fieldErrors.newPassword}
          leftIcon={<LockClosedIcon className="h-5 w-5" />}
          autoComplete="new-password"
          autoFocus
        />

        <Input
          label="Yeni Şifre Tekrarı"
          type="password"
          name="confirmPassword"
          placeholder="Şifrenizi tekrar giriniz"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
          leftIcon={<LockClosedIcon className="h-5 w-5" />}
          autoComplete="new-password"
        />

        <Button type="submit" fullWidth isLoading={isSubmitting}>
          Şifreyi Değiştir
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        <Link
          to="/login"
          className="text-primary hover:text-primary-dark font-medium transition-colors"
        >
          Giriş Sayfasına Dön
        </Link>
      </p>
    </AuthShell>
  );
};

export default ResetPasswordPage;
