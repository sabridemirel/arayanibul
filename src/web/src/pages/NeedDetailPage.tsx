import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  TagIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  FlagIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { needAPI, offerAPI, resolveMediaUrl } from '../services/api';
import type { Need, Offer } from '../services/api';
import { Button, Card, Loading, Badge, ErrorMessage, Toast } from '../components/ui';
import { Header, Footer } from '../components/layout';
import ReportModal from '../components/ReportModal';
import NeedModerationNotice from '../components/NeedModerationNotice';
import { NEED_STATUS_LABELS, NEED_STATUS_TONES, isNeedEditable } from '../services/moderation';
import { useToast } from '../hooks/useToast';

// Loading Skeleton Component
const NeedDetailSkeleton: React.FC = () => (
  <div className="animate-pulse">
    {/* Image skeleton */}
    <div className="aspect-video bg-gray-200 rounded-lg mb-6" />

    {/* Title and badges */}
    <div className="flex items-start justify-between mb-4">
      <div className="h-8 bg-gray-200 rounded w-2/3" />
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 rounded-full w-16" />
        <div className="h-6 bg-gray-200 rounded-full w-16" />
      </div>
    </div>

    {/* Description */}
    <div className="space-y-2 mb-6">
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </div>

    {/* Info rows */}
    <div className="space-y-3 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-5 w-5 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>

    {/* User section */}
    <div className="border-t border-border pt-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 bg-gray-200 rounded-full" />
        <div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-24" />
        </div>
      </div>
    </div>
  </div>
);

// Offer Card Component
interface OfferCardProps {
  offer: Offer;
  isOwner: boolean;
  onAccept?: (offerId: number) => void;
  onReject?: (offerId: number) => void;
  canMessage?: boolean;
}

const OfferCard: React.FC<OfferCardProps> = ({ offer, isOwner, onAccept, onReject, canMessage = false }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="warning">Beklemede</Badge>;
      case 'Accepted':
        return <Badge variant="success">Kabul Edildi</Badge>;
      case 'Rejected':
        return <Badge variant="error">Reddedildi</Badge>;
      case 'Withdrawn':
        return <Badge variant="default">Geri Çekildi</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <Card className="mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {offer.provider?.profileImageUrl ? (
            <img
              src={offer.provider.profileImageUrl}
              alt={`${offer.provider.firstName} ${offer.provider.lastName}`}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <UserCircleIcon className="w-10 h-10 text-text-secondary" />
          )}
          <div>
            <p className="font-medium text-text">
              {offer.provider?.firstName} {offer.provider?.lastName}
            </p>
            {(offer.provider?.rating ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-sm text-text-secondary">
                <StarSolidIcon className="w-4 h-4 text-yellow-500" />
                <span>{(offer.provider?.rating ?? 0).toFixed(1)}</span>
                {(offer.provider?.reviewCount ?? 0) > 0 && (
                  <span>({offer.provider?.reviewCount} değerlendirme)</span>
                )}
              </div>
            )}
          </div>
        </div>
        {getStatusBadge(offer.status)}
      </div>

      <div className="mt-4">
        <p className="text-text-secondary text-sm mb-3">{offer.description}</p>

        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1 text-primary font-semibold">
            <CurrencyDollarIcon className="w-4 h-4" />
            <span>{offer.price.toLocaleString('tr-TR')} {offer.currency}</span>
          </div>
          <div className="flex items-center gap-1 text-text-secondary">
            <ClockIcon className="w-4 h-4" />
            <span>{offer.deliveryDays} gün içinde</span>
          </div>
        </div>

        {offer.images && offer.images.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {offer.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Teklif görseli ${index + 1}`}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            ))}
          </div>
        )}
      </div>

      {isOwner && (offer.status === 'Pending' || canMessage) && (
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
          {offer.status === 'Pending' && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAccept?.(offer.id)}
              >
                Kabul Et
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReject?.(offer.id)}
              >
                Reddet
              </Button>
            </>
          )}
          {!canMessage ? null : (offer.status === 'Pending' || offer.status === 'Accepted') ? (
            <Link
              to={`/messages/${offer.id}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-primary hover:bg-primary-light transition-colors"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              Mesajlaş
            </Link>
          ) : (
            <Link
              to={`/messages/${offer.id}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-text-secondary hover:bg-gray-100 transition-colors"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              Mesajları Gör
            </Link>
          )}
        </div>
      )}
    </Card>
  );
};

// Image Gallery Component
interface ImageGalleryProps {
  images: string[];
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  if (!images || images.length === 0) {
    return (
      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-6">
        <div className="text-center text-text-secondary">
          <TagIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Görsel yok</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Main Image */}
      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
        <img
          src={images[currentIndex]}
          alt={`Görsel ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              aria-label="Önceki görsel"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              aria-label="Sonraki görsel"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>

            {/* Image counter */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                index === currentIndex
                  ? 'border-primary'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              <img
                src={image}
                alt={`Küçük görsel ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Delete Confirmation Modal
interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, onClose, onConfirm, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-full">
            <ExclamationTriangleIcon className="w-6 h-6 text-error" />
          </div>
          <h3 className="text-lg font-semibold text-text">İlanı Sil</h3>
        </div>
        <p className="text-text-secondary mb-6">
          Bu ilanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Vazgeç
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
            Sil
          </Button>
        </div>
      </div>
    </div>
  );
};

// Main Component
const NeedDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isGuest } = useAuth();

  const [need, setNeed] = useState<Need | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffersLoading, setIsOffersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const needId = id ? parseInt(id, 10) : null;
  const isOwner = user && need && user.id === need.userId;
  const isUnderModeration = need?.status === 'PendingReview' || need?.status === 'Rejected';
  const canReport = isAuthenticated && !isGuest && !!need && !isOwner;
  const [myOffer, setMyOffer] = useState<Offer | null>(null);
  // A pending or accepted offer replaces the "Teklif Ver" button (the API rejects a second pending one)
  const hasActiveOffer = !!myOffer && (myOffer.status === 'Pending' || myOffer.status === 'Accepted');
  const canCreateOffer = isAuthenticated && !isGuest && user && need && user.id !== need.userId && need.status === 'Active' && !hasActiveOffer;

  useEffect(() => {
    if (!needId || !isAuthenticated || isGuest || !need || isOwner) {
      setMyOffer(null);
      return;
    }
    let cancelled = false;
    offerAPI.getMyOfferForNeed(needId)
      .then(offer => { if (!cancelled) setMyOffer(offer); })
      .catch(() => { if (!cancelled) setMyOffer(null); });
    return () => { cancelled = true; };
  }, [needId, isAuthenticated, isGuest, need, isOwner]);

  const loadNeedDetail = useCallback(async () => {
    if (!needId) {
      setError('Geçersiz ilan ID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const needData = await needAPI.getNeedById(needId);
      setNeed(needData);

      // Load offers if user is the owner
      if (user && needData.userId === user.id) {
        loadOffers();
      }
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'İhtiyaç detayları yüklenirken hata oluştu';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [needId, user]);

  const loadOffers = async () => {
    if (!needId) return;

    try {
      setIsOffersLoading(true);
      const offersData = await offerAPI.getOffersForNeed(needId);
      setOffers(offersData);
    } catch (err) {
      console.error('Teklifler yüklenirken hata:', err);
    } finally {
      setIsOffersLoading(false);
    }
  };

  useEffect(() => {
    loadNeedDetail();
  }, [loadNeedDetail]);

  const handleCreateOffer = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/needs/${needId}` } });
      return;
    }

    if (isGuest) {
      navigate('/register', { state: { from: `/needs/${needId}` } });
      return;
    }

    // Navigate to create offer page
    navigate(`/offers/create/${needId}`);
  };

  const handleEdit = () => {
    navigate(`/needs/${needId}/edit`);
  };

  const handleDelete = async () => {
    if (!needId) return;

    try {
      setIsDeleting(true);
      await needAPI.deleteNeed(needId);
      navigate('/my-needs');
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'İlan silinirken hata oluştu';
      setError(errorMessage);
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAcceptOffer = async (offerId: number) => {
    try {
      await offerAPI.acceptOffer(offerId);
      loadOffers();
      // Accepting moves the need to "Devam Ediyor"; refresh it so the status badge updates
      if (needId) {
        needAPI.getNeedById(needId).then(setNeed).catch(() => {});
      }
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Teklif kabul edilirken hata oluştu';
      setError(errorMessage);
    }
  };

  const handleRejectOffer = async (offerId: number) => {
    try {
      await offerAPI.rejectOffer(offerId);
      loadOffers();
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Teklif reddedilirken hata oluştu';
      setError(errorMessage);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'Urgent':
        return <Badge variant="error">Acil</Badge>;
      case 'Normal':
        return <Badge variant="warning">Normal</Badge>;
      default:
        return <Badge variant="warning">Normal</Badge>;
    }
  };

  const getStatusBadge = (status: string) => (
    <Badge variant={NEED_STATUS_TONES[status] ?? 'default'}>{NEED_STATUS_LABELS[status] ?? status}</Badge>
  );

  const formatBudget = (minBudget?: number, maxBudget?: number, currency = 'TRY') => {
    if (!minBudget && !maxBudget) return 'Bütçe belirtilmemiş';
    if (minBudget && maxBudget) {
      return `${minBudget.toLocaleString('tr-TR')} - ${maxBudget.toLocaleString('tr-TR')} ${currency}`;
    }
    if (minBudget) {
      return `${minBudget.toLocaleString('tr-TR')} ${currency} ve üzeri`;
    }
    if (maxBudget) {
      return `${maxBudget.toLocaleString('tr-TR')} ${currency} ve altı`;
    }
    return '';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors mb-6"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Geri Dön</span>
          </button>

          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card>
                  <NeedDetailSkeleton />
                </Card>
              </div>
              <div>
                <Card>
                  <div className="animate-pulse space-y-4">
                    <div className="h-10 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </div>
                </Card>
              </div>
            </div>
          ) : error || !need ? (
            <Card className="max-w-xl mx-auto text-center py-12">
              <ErrorMessage
                message={error || 'İhtiyaç bulunamadı'}
                className="mb-4"
              />
              <Button variant="primary" onClick={loadNeedDetail}>
                Tekrar Dene
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2">
                <Card padding="lg">
                  {isOwner && isUnderModeration && <NeedModerationNotice need={need} className="mb-6" />}

                  {/* Image Gallery */}
                  <ImageGallery images={(need.images || []).map(image => resolveMediaUrl(image.imageUrl))} />

                  {/* Title and Badges */}
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <h1 className="text-2xl lg:text-3xl font-bold text-text flex-1">
                      {need.title}
                    </h1>
                    <div className="flex gap-2 flex-shrink-0">
                      {getUrgencyBadge(need.urgency)}
                      {getStatusBadge(need.status)}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-text-secondary leading-relaxed mb-6 whitespace-pre-wrap">
                    {need.description}
                  </p>

                  {/* Info Section */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-text-secondary">
                      <TagIcon className="w-5 h-5 flex-shrink-0" />
                      <span>{need.category?.nameTr || 'Kategori'}</span>
                    </div>

                    {(need.minBudget || need.maxBudget) && (
                      <div className="flex items-center gap-3 text-text-secondary">
                        <CurrencyDollarIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-primary font-medium">
                          {formatBudget(need.minBudget, need.maxBudget, need.currency)}
                        </span>
                      </div>
                    )}

                    {need.address && (
                      <div className="flex items-center gap-3 text-text-secondary">
                        <MapPinIcon className="w-5 h-5 flex-shrink-0" />
                        <span>{need.address}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-text-secondary">
                      <ClockIcon className="w-5 h-5 flex-shrink-0" />
                      <span>{formatDate(need.createdAt)} tarihinde oluşturuldu</span>
                    </div>

                    {need.expiresAt && (
                      <div className="flex items-center gap-3 text-text-secondary">
                        <CalendarDaysIcon className="w-5 h-5 flex-shrink-0" />
                        <span>{formatDate(need.expiresAt)} tarihinde sona eriyor</span>
                      </div>
                    )}
                  </div>

                  {/* User Section */}
                  <div className="border-t border-border pt-6">
                    <div className="flex items-center gap-4">
                      {need.user?.profileImageUrl ? (
                        <img
                          src={need.user.profileImageUrl}
                          alt={`${need.user.firstName} ${need.user.lastName}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <UserCircleIcon className="w-12 h-12 text-primary" />
                      )}
                      <div>
                        <p className="font-semibold text-text">
                          {need.user?.firstName} {need.user?.lastName}
                        </p>
                        {(need.user?.rating ?? 0) > 0 && (
                          <div className="flex items-center gap-1 text-sm text-text-secondary">
                            <StarSolidIcon className="w-4 h-4 text-yellow-500" />
                            <span>{(need.user?.rating ?? 0).toFixed(1)}</span>
                            {need.user?.reviewCount !== undefined && (
                              <span>({need.user?.reviewCount} değerlendirme)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Owner Actions */}
                  {isOwner && (
                    <div className="border-t border-border pt-6 mt-6 flex gap-3">
                      {isNeedEditable(need.status) && (
                        <Button
                          variant="outline"
                          leftIcon={<PencilSquareIcon className="w-4 h-4" />}
                          onClick={handleEdit}
                        >
                          Düzenle
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        leftIcon={<TrashIcon className="w-4 h-4" />}
                        onClick={() => setIsDeleteModalOpen(true)}
                      >
                        Sil
                      </Button>
                    </div>
                  )}
                </Card>

                {/* Offers Section (for owner) */}
                {isOwner && (
                  <div className="mt-8">
                    <h2 className="text-xl font-bold text-text mb-4">
                      Teklifler {offers.length > 0 && `(${offers.length})`}
                    </h2>

                    {isOffersLoading ? (
                      <Card>
                        <div className="flex items-center justify-center py-8">
                          <Loading size="md" text="Teklifler yükleniyor..." />
                        </div>
                      </Card>
                    ) : offers.length === 0 ? (
                      <Card className="text-center py-8">
                        <p className="text-text-secondary">
                          Henüz teklif yok. Satıcıların tekliflerini bekliyorsunuz.
                        </p>
                      </Card>
                    ) : (
                      offers.map((offer) => (
                        <OfferCard
                          key={offer.id}
                          offer={offer}
                          isOwner={true}
                          canMessage={!isGuest}
                          onAccept={handleAcceptOffer}
                          onReject={handleRejectOffer}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  {/* Action Card */}
                  <Card padding="lg" className="mb-6">
                    {hasActiveOffer && myOffer ? (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-text-primary">Teklifiniz</p>
                          <Badge variant={myOffer.status === 'Accepted' ? 'success' : 'warning'}>
                            {myOffer.status === 'Accepted' ? 'Kabul Edildi' : 'Beklemede'}
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold text-primary mb-1">
                          {myOffer.price.toLocaleString('tr-TR')} {myOffer.currency === 'TRY' ? 'TL' : myOffer.currency}
                        </p>
                        <p className="text-text-secondary text-sm mb-4">
                          {myOffer.status === 'Accepted'
                            ? 'Alıcı teklifinizi kabul etti. Ayrıntıları mesajlaşarak netleştirebilirsiniz.'
                            : 'Teklifiniz alıcıya iletildi. Bu arada alıcıyla mesajlaşabilirsiniz.'}
                        </p>
                        <Button variant="primary" size="lg" fullWidth onClick={() => navigate(`/messages/${myOffer.id}`)}>
                          Mesajlaş
                        </Button>
                        <Link
                          to="/my-offers"
                          className="block text-center text-primary hover:text-primary-dark text-sm mt-3"
                        >
                          Tekliflerim
                        </Link>
                      </div>
                    ) : canCreateOffer ? (
                      <>
                        {myOffer?.status === 'Rejected' && (
                          <p className="text-text-secondary text-sm text-center mb-3">
                            Önceki teklifiniz reddedildi. Yeni bir teklif verebilirsiniz.
                          </p>
                        )}
                        <Button
                          variant="primary"
                          size="lg"
                          fullWidth
                          onClick={handleCreateOffer}
                        >
                          Teklif Ver
                        </Button>
                        <p className="text-text-secondary text-sm text-center mt-3">
                          Bu ihtiyaca teklif vererek satıcı olarak başvurun
                        </p>
                      </>
                    ) : isOwner ? (
                      <div className="text-center">
                        <p className="text-text-secondary text-sm">
                          {need.status === 'PendingReview'
                            ? 'Bu sizin ilanınız. İncelendikten sonra yayınlanacak.'
                            : need.status === 'Rejected'
                              ? 'Bu sizin ilanınız. İlan yayınlanmadı; nedenini ilanın üstündeki bilgilendirmede görebilirsiniz.'
                              : 'Bu sizin ilanınız. Gelen teklifleri aşağıda görebilirsiniz.'}
                        </p>
                      </div>
                    ) : !isAuthenticated ? (
                      <>
                        <Button
                          variant="primary"
                          size="lg"
                          fullWidth
                          onClick={() => navigate('/login', { state: { from: `/needs/${needId}` } })}
                        >
                          Giriş Yap ve Teklif Ver
                        </Button>
                        <p className="text-text-secondary text-sm text-center mt-3">
                          Teklif vermek için giriş yapmalısınız
                        </p>
                        <div className="border-t border-border mt-4 pt-4">
                          <Link
                            to="/register"
                            className="block text-center text-primary hover:text-primary-dark text-sm"
                          >
                            Hesabınız yok mu? Kayıt olun
                          </Link>
                        </div>
                      </>
                    ) : isGuest ? (
                      <>
                        <Button
                          variant="primary"
                          size="lg"
                          fullWidth
                          onClick={() => navigate('/register', { state: { from: `/needs/${needId}` } })}
                        >
                          Hesap Oluştur
                        </Button>
                        <p className="text-text-secondary text-sm text-center mt-3">
                          Teklif vermek için tam hesap oluşturmalısınız
                        </p>
                      </>
                    ) : need.status !== 'Active' ? (
                      <div className="text-center">
                        <p className="text-text-secondary text-sm">
                          Bu ilan artık aktif değil. Teklif verilemez.
                        </p>
                      </div>
                    ) : null}
                    {canReport && (
                      <div className="border-t border-border mt-4 pt-3 text-center">
                        <button
                          type="button"
                          onClick={() => setIsReportOpen(true)}
                          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-error transition-colors"
                        >
                          <FlagIcon className="w-4 h-4" />
                          Şikayet Et
                        </button>
                      </div>
                    )}
                  </Card>

                  {/* Stats Card */}
                  {need.offerCount !== undefined && need.offerCount > 0 && !isOwner && (
                    <Card padding="lg">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-primary">{need.offerCount}</p>
                        <p className="text-text-secondary text-sm">teklif alındı</p>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {need && canReport && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          targetType="Need"
          targetId={need.id}
          onReported={(message) => showToast(message)}
        />
      )}
      <Toast toast={toast} onClose={hideToast} />

      {/* Delete Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default NeedDetailPage;
