import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCircleIcon,
  PencilSquareIcon,
  TagIcon,
  StarIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { userAPI } from '../services/api';
import type { UserStats } from '../services/api';
import { Button, Card, Loading, ErrorMessage, Badge } from '../components/ui';
import { Header, Footer } from '../components/layout';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, isGuest } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (user) {
      loadUserStats();
      loadUnreadCount();
    }
  }, [user]);

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
            'Istatistikler yuklenirken hata olustu';
      setStatsError(errorMessage);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const { notificationAPI } = await import('../services/api');
      const result = await notificationAPI.getUnreadCount();
      setUnreadNotifications(result.count);
    } catch {
      // Silently fail - notifications badge is optional
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
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
              Giris Yapmaniz Gerekiyor
            </h2>
            <p className="text-text-secondary mb-6">
              Profil sayfasini goruntulemek icin lutfen giris yapin.
            </p>
            <div className="flex flex-col gap-3">
              <Button variant="primary" fullWidth onClick={() => navigate('/login')}>
                Giris Yap
              </Button>
              <Button variant="outline" fullWidth onClick={() => navigate('/register')}>
                Kayit Ol
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
                    className="w-28 h-28 rounded-full object-cover border-4 border-primary-light"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-primary-light flex items-center justify-center border-4 border-primary/20">
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
                  Misafir Kullanici
                </Badge>
              )}

              {/* Rating Display */}
              {user.rating !== undefined && (
                <button
                  onClick={() => navigate('/reviews')}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="flex">{renderStars(user.rating)}</div>
                  <span className="text-text font-medium">
                    {user.rating.toFixed(1)}
                  </span>
                  {user.reviewCount !== undefined && user.reviewCount > 0 && (
                    <span className="text-text-secondary text-sm">
                      ({user.reviewCount} degerlendirme)
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Notifications Button */}
            <button
              onClick={() => navigate('/notifications')}
              className="w-full flex items-center justify-between p-4 bg-background rounded-lg mb-4 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <BellIcon className="h-6 w-6 text-primary" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-error text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium text-text">Bildirimler</p>
                  <p className="text-sm text-text-secondary">
                    {unreadNotifications > 0
                      ? `${unreadNotifications} okunmamis bildirim`
                      : 'Tum bildirimler okundu'}
                  </p>
                </div>
              </div>
              <svg
                className="h-5 w-5 text-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                variant="primary"
                fullWidth
                leftIcon={<PencilSquareIcon className="h-5 w-5" />}
                onClick={() => navigate('/edit-profile')}
              >
                Profili Duzenle
              </Button>

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
                leftIcon={<StarIcon className="h-5 w-5" />}
                onClick={() => navigate('/reviews')}
              >
                Degerlendirmelerim
              </Button>

              <Button
                variant="danger"
                fullWidth
                leftIcon={<ArrowRightOnRectangleIcon className="h-5 w-5" />}
                onClick={handleLogout}
              >
                Cikis Yap
              </Button>
            </div>
          </Card>

          {/* Statistics Card */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-text text-center mb-6">
              Istatistikler
            </h2>

            {statsLoading ? (
              <div className="flex justify-center py-8">
                <Loading size="md" text="Istatistikler yukleniyor..." />
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
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <button
                    onClick={() => navigate('/my-needs')}
                    className="flex flex-col items-center p-4 bg-background rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <DocumentTextIcon className="h-8 w-8 text-primary mb-2" />
                    <span className="text-2xl font-bold text-primary">
                      {stats?.needsCount ?? 0}
                    </span>
                    <span className="text-sm text-text-secondary">Ihtiyaclar</span>
                  </button>

                  <button
                    onClick={() => navigate('/my-offers')}
                    className="flex flex-col items-center p-4 bg-background rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary mb-2" />
                    <span className="text-2xl font-bold text-primary">
                      {stats?.offersGivenCount ?? 0}
                    </span>
                    <span className="text-sm text-text-secondary">Teklifler</span>
                  </button>

                  <button
                    onClick={() => navigate('/transactions')}
                    className="flex flex-col items-center p-4 bg-background rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <CheckCircleIcon className="h-8 w-8 text-primary mb-2" />
                    <span className="text-2xl font-bold text-primary">
                      {stats?.completedTransactionsCount ?? 0}
                    </span>
                    <span className="text-sm text-text-secondary">Tamamlanan</span>
                  </button>
                </div>

                {/* Transactions Button */}
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => navigate('/transactions')}
                >
                  Islem Gecmisi
                </Button>
              </>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfilePage;
