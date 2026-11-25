import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserCircleIcon,
  TagIcon,
  StarIcon,
  ArrowRightOnRectangleIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import type { UserStats } from '../services/api';
import { Button, Card, Loading, ErrorMessage, Badge, Input } from '../components/ui';
import { Header, Footer } from '../components/layout';
import BlockedUsersCard from '../components/BlockedUsersCard';
import CategoryFollowCard from '../components/CategoryFollowCard';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isGuest } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadUserStats();
    }
  }, [user]);

  const logoutOnUnmountRef = useRef(false);
  useEffect(() => {
    return () => {
      if (logoutOnUnmountRef.current) {
        logout();
      }
    };
  }, [logout]);

  const loadUserStats = async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      const statsData = await userAPI.getUserStats();
      setStats(statsData);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'İstatistikler yüklenirken hata oluştu';
      setStatsError(errorMessage);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Accept "SİL" in any case; also "SIL" for keyboards without Turkish letters
  const normalizedConfirm = deleteConfirmText.trim().toLocaleUpperCase('tr-TR');
  const canConfirmDelete = normalizedConfirm === 'SİL' || normalizedConfirm === 'SIL';

  const openDeleteDialog = () => {
    setDeleteConfirmText('');
    setDeleteError(null);
    setShowDeleteDialog(true);
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setShowDeleteDialog(false);
  };

  const handleDeleteAccount = async () => {
    if (!canConfirmDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await userAPI.deleteAccount();
      // Log out once this page unmounts: logging out first would let the protected
      // /profile route redirect to /login before the navigation to / is applied.
      logoutOnUnmountRef.current = true;
      navigate('/', {
        replace: true,
        state: { flash: 'Hesabınız silindi. Arayanibul\'u kullandığınız için teşekkür ederiz.' },
      });
    } catch {
      setDeleteError('Hesabınız silinemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
      setIsDeleting(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <StarSolidIcon key={i} className="h-5 w-5 text-yellow-400" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <StarIcon className="h-5 w-5 text-gray-300" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <StarSolidIcon className="h-5 w-5 text-yellow-400" />
            </div>
          </div>
        );
      } else {
        stars.push(<StarIcon key={i} className="h-5 w-5 text-gray-300" />);
      }
    }
    return stars;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="text-center max-w-md w-full">
            <UserCircleIcon className="h-16 w-16 text-text-secondary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-text mb-2">
              Giriş Yapmanız Gerekiyor
            </h2>
            <p className="text-text-secondary mb-6">
              Profil sayfasını görüntülemek için lütfen giriş yapın.
            </p>
            <div className="flex flex-col gap-3">
              <Button variant="primary" fullWidth onClick={() => navigate('/login')}>
                Giriş Yap
              </Button>
              <Button variant="outline" fullWidth onClick={() => navigate('/register')}>
                Kayıt Ol
              </Button>
            </div>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Profile Card */}
          <Card padding="lg" className="mb-6">
            {/* Profile Header */}
            <div className="flex flex-col items-center mb-6">
              {/* Avatar */}
              <div className="relative mb-4">
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-28 h-28 rounded-full object-cover border-4 border-[#7B2CBF]/30 ring-4 ring-[#7B2CBF]/10"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-primary-light flex items-center justify-center border-4 border-[#7B2CBF]/30 ring-4 ring-[#7B2CBF]/10">
                    <UserCircleIcon className="h-20 w-20 text-primary" />
                  </div>
                )}
              </div>

              {/* Name and Email */}
              <h1 className="text-2xl font-bold text-text mb-1">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-text-secondary mb-3">{user.email}</p>

              {/* Guest Badge */}
              {isGuest && (
                <Badge variant="default" size="md" className="mb-3">
                  <UserCircleIcon className="h-4 w-4 mr-1" />
                  Misafir Kullanıcı
                </Badge>
              )}

              {/* Rating Display */}
              {user.rating !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="flex">{renderStars(user.rating)}</div>
                  <span className="text-text font-medium">
                    {user.rating.toFixed(1)}
                  </span>
                  {user.reviewCount !== undefined && user.reviewCount > 0 && (
                    <span className="text-text-secondary text-sm">
                      ({user.reviewCount} değerlendirme)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                fullWidth
                leftIcon={<TagIcon className="h-5 w-5" />}
                onClick={() => navigate('/my-offers')}
              >
                Tekliflerim
              </Button>

              <Button
                variant="outline"
                fullWidth
                leftIcon={<DocumentTextIcon className="h-5 w-5" />}
                onClick={() => navigate('/my-needs')}
              >
                İlanlarım
              </Button>

              <Button
                variant="danger"
                fullWidth
                leftIcon={<ArrowRightOnRectangleIcon className="h-5 w-5" />}
                onClick={handleLogout}
              >
                Çıkış Yap
              </Button>
            </div>
          </Card>

          {/* Statistics Card */}
          <Card padding="lg" className="mb-6">
            <h2 className="text-lg font-semibold text-text text-center mb-6">
              İstatistikler
            </h2>

            {statsLoading ? (
              <div className="flex justify-center py-8">
                <Loading size="md" text="İstatistikler yükleniyor..." />
              </div>
            ) : statsError ? (
              <div className="space-y-4">
                <ErrorMessage message={statsError} />
                <Button
                  variant="outline"
                  fullWidth
                  onClick={loadUserStats}
                >
                  Tekrar Dene
                </Button>
              </div>
            ) : (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => navigate('/my-needs')}
                    className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 border border-purple-100 transition-colors"
                  >
                    <DocumentTextIcon className="h-8 w-8 text-primary mb-2" />
                    <span className="text-2xl font-bold text-primary">
                      {stats?.needsCount ?? 0}
                    </span>
                    <span className="text-sm text-text-secondary">İhtiyaçlar</span>
                  </button>

                  <button
                    onClick={() => navigate('/my-offers')}
                    className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 border border-purple-100 transition-colors"
                  >
                    <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary mb-2" />
                    <span className="text-2xl font-bold text-primary">
                      {stats?.offersGivenCount ?? 0}
                    </span>
                    <span className="text-sm text-text-secondary">Teklifler</span>
                  </button>

                  <div className="flex flex-col items-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <CheckCircleIcon className="h-8 w-8 text-primary mb-2" />
                    <span className="text-2xl font-bold text-primary">
                      {stats?.completedTransactionsCount ?? 0}
                    </span>
                    <span className="text-sm text-text-secondary">Tamamlanan</span>
                  </div>
                </div>

              </>
            )}
          </Card>

          {!isGuest && <CategoryFollowCard className="mb-6" />}
          {!isGuest && <BlockedUsersCard className="mb-6" />}

          {/* Danger Zone: account deletion (registered users only) */}
          {!isGuest && (
            <Card padding="lg" className="!border-red-200">
              <h2 className="text-lg font-semibold text-error mb-2">Hesabımı Sil</h2>
              <p className="text-sm text-text-secondary mb-3">
                Hesabınızı sildiğinizde:
              </p>
              <ul className="list-disc pl-5 text-sm text-text-secondary space-y-1 mb-4">
                <li>İlanlarınız kapatılır.</li>
                <li>Bekleyen teklifleriniz geri çekilir.</li>
                <li>Mesaj geçmişiniz karşı taraf için "Silinmiş Kullanıcı" olarak kalır.</li>
                <li>Profil bilgileriniz silinir.</li>
                <li><strong className="text-text">Bu işlem geri alınamaz.</strong></li>
              </ul>
              <p className="text-xs text-text-secondary mb-4">
                Ayrıntılar için{' '}
                <Link to="/account-deletion" className="text-primary hover:text-primary-dark underline">
                  Hesap Silme
                </Link>{' '}
                sayfasına bakabilirsiniz.
              </p>
              <Button
                variant="outline"
                fullWidth
                leftIcon={<TrashIcon className="h-5 w-5" />}
                onClick={openDeleteDialog}
                className="!border-error !text-error hover:!bg-red-50"
              >
                Hesabımı Sil
              </Button>
            </Card>
          )}
        </div>
      </main>

      {showDeleteDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={closeDeleteDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="bg-surface rounded-lg shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 rounded-full bg-red-100 p-2">
                <ExclamationTriangleIcon className="h-6 w-6 text-error" />
              </div>
              <div>
                <h3 id="delete-account-title" className="text-lg font-semibold text-text">
                  Hesabınız kalıcı olarak silinecek
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  İlanlarınız kapatılacak, bekleyen teklifleriniz geri çekilecek. Bu işlem geri
                  alınamaz. Onaylamak için aşağıya <strong className="text-text">SİL</strong> yazın.
                </p>
              </div>
            </div>

            {deleteError && (
              <ErrorMessage
                message={deleteError}
                onDismiss={() => setDeleteError(null)}
                className="mb-4"
              />
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
            >
              <Input
                label="Onay"
                name="deleteConfirm"
                placeholder="SİL"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                autoComplete="off"
                autoFocus
                disabled={isDeleting}
              />

              <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onClick={closeDeleteDialog}
                  disabled={isDeleting}
                >
                  Vazgeç
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  fullWidth
                  isLoading={isDeleting}
                  disabled={!canConfirmDelete || isDeleting}
                >
                  Hesabımı Kalıcı Olarak Sil
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ProfilePage;
