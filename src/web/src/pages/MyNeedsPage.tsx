import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  TagIcon,
  CalendarDaysIcon,
  MapPinIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { needAPI } from '../services/api';
import type { Need } from '../services/api';
import { Button, Card, Loading, Badge, ErrorMessage } from '../components/ui';
import { Header, Footer } from '../components/layout';

type NeedStatus = 'All' | 'Active' | 'InProgress' | 'Completed' | 'Cancelled' | 'Expired';

interface StatusOption {
  key: NeedStatus;
  label: string;
}

const statusOptions: StatusOption[] = [
  { key: 'All', label: 'Tumunu' },
  { key: 'Active', label: 'Aktif' },
  { key: 'InProgress', label: 'Devam Eden' },
  { key: 'Completed', label: 'Tamamlanmis' },
  { key: 'Expired', label: 'Suresi Dolmus' },
  { key: 'Cancelled', label: 'Iptal Edilmis' },
];

const MyNeedsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isGuest } = useAuth();

  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<NeedStatus>('All');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [needToDelete, setNeedToDelete] = useState<Need | null>(null);

  const loadMyNeeds = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const status = selectedStatus === 'All' ? undefined : selectedStatus;
      const needsData = await needAPI.getUserNeeds(status);
      setNeeds(needsData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error
        ? err.message
        : (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Ihtiyaclar yuklenirken hata olustu';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, selectedStatus]);

  useEffect(() => {
    if (isAuthenticated) {
      loadMyNeeds();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, loadMyNeeds]);

  const handleCreateNeed = () => {
    if (isGuest) {
      navigate('/login');
      return;
    }
    navigate('/create-need');
  };

  const handleEditNeed = (needId: number) => {
    navigate(`/needs/${needId}/edit`);
  };

  const handleDeleteClick = (need: Need) => {
    setNeedToDelete(need);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!needToDelete) return;

    try {
      setDeletingId(needToDelete.id);
      await needAPI.deleteNeed(needToDelete.id);
      setNeeds(needs.filter(n => n.id !== needToDelete.id));
      setShowDeleteModal(false);
      setNeedToDelete(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error
        ? err.message
        : (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Ihtiyac silinirken hata olustu';
      setError(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setNeedToDelete(null);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Active':
        return 'Aktif';
      case 'InProgress':
        return 'Devam Ediyor';
      case 'Completed':
        return 'Tamamlandi';
      case 'Cancelled':
        return 'Iptal Edildi';
      case 'Expired':
        return 'Suresi Doldu';
      default:
        return status;
    }
  };

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'primary' | 'error' | 'default' => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'InProgress':
        return 'warning';
      case 'Completed':
        return 'primary';
      case 'Cancelled':
      case 'Expired':
        return 'error';
      default:
        return 'default';
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Urgent':
        return <Badge variant="error">Acil</Badge>;
      case 'Normal':
        return <Badge variant="warning">Normal</Badge>;
      default:
        return <Badge variant="default">Esnek</Badge>;
    }
  };

  const formatBudget = (need: Need) => {
    if (need.minBudget && need.maxBudget) {
      return `${need.minBudget.toLocaleString('tr-TR')} - ${need.maxBudget.toLocaleString('tr-TR')} ${need.currency}`;
    }
    if (need.maxBudget) {
      return `${need.maxBudget.toLocaleString('tr-TR')} ${need.currency}'ye kadar`;
    }
    if (need.minBudget) {
      return `${need.minBudget.toLocaleString('tr-TR')} ${need.currency}'den baslayan`;
    }
    return 'Belirtilmemis';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Az once';
    if (diffInHours < 24) return `${diffInHours} saat once`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} gun once`;

    return date.toLocaleDateString('tr-TR');
  };

  const getFilteredNeeds = () => {
    if (selectedStatus === 'All') return needs;
    return needs.filter(need => need.status === selectedStatus);
  };

  const getStatusCount = (status: NeedStatus) => {
    if (status === 'All') return needs.length;
    return needs.filter(need => need.status === status).length;
  };

  const filteredNeeds = getFilteredNeeds();

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card className="text-center py-12">
              <ClipboardDocumentListIcon className="h-16 w-16 text-text-secondary mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-text mb-2">Giris Yapmaniz Gerekiyor</h2>
              <p className="text-text-secondary mb-6">
                Ihtiyaclarinizi goruntulemek icin lutfen giris yapin.
              </p>
              <Button variant="primary" onClick={() => navigate('/login')}>
                Giris Yap
              </Button>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-text">Ihtiyaclarim</h1>
              <p className="text-text-secondary mt-1">
                Olusturdugununuz tum ihtiyaclari buradan yonetin
              </p>
            </div>
            <Button
              variant="primary"
              leftIcon={<PlusCircleIcon className="h-5 w-5" />}
              onClick={handleCreateNeed}
            >
              Yeni Ihtiyac Olustur
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <ErrorMessage
              message={error}
              onDismiss={() => setError(null)}
              className="mb-6"
            />
          )}

          {/* Status Filter Tabs */}
          <div className="mb-6 overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-2">
              {statusOptions.map((option) => {
                const count = getStatusCount(option.key);
                const isSelected = selectedStatus === option.key;

                return (
                  <button
                    key={option.key}
                    onClick={() => setSelectedStatus(option.key)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200
                      ${isSelected
                        ? 'bg-primary text-white'
                        : 'bg-surface border border-border text-text hover:bg-gray-50'
                      }
                    `}
                  >
                    {option.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loading size="lg" text="Ihtiyaclariniz yukleniyor..." />
            </div>
          ) : filteredNeeds.length === 0 ? (
            /* Empty State */
            <Card className="text-center py-12">
              <ClipboardDocumentListIcon className="h-16 w-16 text-text-secondary mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-text mb-2">
                {selectedStatus === 'All' ? 'Henuz ihtiyac yok' : `${statusOptions.find(s => s.key === selectedStatus)?.label} ihtiyac yok`}
              </h2>
              <p className="text-text-secondary mb-6">
                {selectedStatus === 'All'
                  ? 'Ilk ihtiyacinizi olusturmak icin asagidaki butona tiklayin.'
                  : 'Bu durumda hic ihtiyaciniz bulunmuyor.'
                }
              </p>
              {selectedStatus === 'All' && (
                <Button
                  variant="primary"
                  leftIcon={<PlusCircleIcon className="h-5 w-5" />}
                  onClick={handleCreateNeed}
                >
                  Ihtiyac Olustur
                </Button>
              )}
            </Card>
          ) : (
            /* Needs Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNeeds.map((need) => (
                <Card key={need.id} hover className="flex flex-col">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <Link
                      to={`/needs/${need.id}`}
                      className="flex-1 min-w-0"
                    >
                      <h3 className="font-semibold text-text line-clamp-2 hover:text-primary transition-colors">
                        {need.title}
                      </h3>
                    </Link>
                    <div className="flex gap-1 flex-shrink-0">
                      {getUrgencyBadge(need.urgency)}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-3">
                    <Badge variant={getStatusBadgeVariant(need.status)}>
                      {getStatusText(need.status)}
                    </Badge>
                  </div>

                  {/* Description */}
                  <Link to={`/needs/${need.id}`}>
                    <p className="text-text-secondary text-sm line-clamp-2 mb-4 hover:text-text transition-colors">
                      {need.description}
                    </p>
                  </Link>

                  {/* Meta Info */}
                  <div className="space-y-2 mb-4 flex-1">
                    {/* Category */}
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <TagIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{need.category?.nameTr || 'Kategori'}</span>
                    </div>

                    {/* Budget */}
                    {(need.minBudget || need.maxBudget) && (
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <CurrencyDollarIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{formatBudget(need)}</span>
                      </div>
                    )}

                    {/* Location */}
                    {need.address && (
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{need.address}</span>
                      </div>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <CalendarDaysIcon className="h-4 w-4 flex-shrink-0" />
                      <span>{formatDate(need.createdAt)}</span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    {/* Offer Count */}
                    <div>
                      {need.offerCount !== undefined && need.offerCount > 0 ? (
                        <Badge variant="primary">
                          {need.offerCount} teklif
                        </Badge>
                      ) : (
                        <span className="text-sm text-text-secondary">Henuz teklif yok</span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {need.status === 'Active' && (
                        <button
                          onClick={() => handleEditNeed(need.id)}
                          className="p-2 rounded-lg text-primary hover:bg-primary-light transition-colors"
                          title="Duzenle"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteClick(need)}
                        disabled={deletingId === need.id}
                        className="p-2 rounded-lg text-error hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="Sil"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && needToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-text mb-2">
              Ihtiyaci Sil
            </h3>
            <p className="text-text-secondary mb-6">
              "<span className="font-medium text-text">{needToDelete.title}</span>" baslikli ihtiyacinizi silmek istediginizden emin misiniz? Bu islem geri alinamaz.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={handleDeleteCancel}
                disabled={deletingId !== null}
              >
                Iptal
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteConfirm}
                isLoading={deletingId === needToDelete.id}
              >
                Sil
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyNeedsPage;
