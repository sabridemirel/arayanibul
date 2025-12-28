import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  TagIcon,
  CalendarDaysIcon,
  TruckIcon,
  FolderOpenIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { offerAPI } from '../services/api';
import type { Offer } from '../services/api';
import { Button, Card, Loading, Badge, ErrorMessage } from '../components/ui';
import { Header, Footer } from '../components/layout';

type FilterType = 'all' | 'Pending' | 'Accepted' | 'Rejected';

interface FilterOption {
  key: FilterType;
  label: string;
  count: number;
}

const MyOffersPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [withdrawingOfferId, setWithdrawingOfferId] = useState<number | null>(null);

  const filterOptions: FilterOption[] = [
    { key: 'all', label: 'Tumu', count: offers.length },
    { key: 'Pending', label: 'Beklemede', count: offers.filter(o => o.status === 'Pending').length },
    { key: 'Accepted', label: 'Kabul Edildi', count: offers.filter(o => o.status === 'Accepted').length },
    { key: 'Rejected', label: 'Reddedildi', count: offers.filter(o => o.status === 'Rejected').length },
  ];

  const loadOffers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const offersData = await offerAPI.getMyOffers();
      setOffers(offersData);
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Teklifler yuklenirken hata olustu';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadOffers();
  }, [isAuthenticated, navigate, loadOffers]);

  const handleOfferClick = (offer: Offer) => {
    if (offer.need) {
      navigate(`/needs/${offer.need.id}`);
    }
  };

  const handleWithdrawOffer = async (offerId: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!window.confirm('Bu teklifi geri cekmek istediginizden emin misiniz?')) {
      return;
    }

    try {
      setWithdrawingOfferId(offerId);
      // Note: Backend may need to implement this endpoint
      // For now we show a placeholder message
      alert('Teklif geri cekme ozelligi yakin zamanda eklenecek.');
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Teklif geri cekilirken hata olustu';
      alert(errorMessage);
    } finally {
      setWithdrawingOfferId(null);
    }
  };

  const getStatusColor = (status: string): 'warning' | 'success' | 'error' | 'default' => {
    switch (status) {
      case 'Pending':
        return 'warning';
      case 'Accepted':
        return 'success';
      case 'Rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'Pending':
        return 'Beklemede';
      case 'Accepted':
        return 'Kabul Edildi';
      case 'Rejected':
        return 'Reddedildi';
      case 'Withdrawn':
        return 'Geri Cekildi';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <ClockIcon className="h-4 w-4" />;
      case 'Accepted':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'Rejected':
        return <XCircleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number, currency: string): string => {
    return `${price.toLocaleString('tr-TR')} ${currency}`;
  };

  const filteredOffers = selectedFilter === 'all'
    ? offers
    : offers.filter(offer => offer.status === selectedFilter);

  const renderFilterTabs = () => (
    <div className="flex flex-wrap gap-2 mb-6">
      {filterOptions.map((filter) => (
        <button
          key={filter.key}
          onClick={() => setSelectedFilter(filter.key)}
          className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
            transition-colors duration-200
            ${selectedFilter === filter.key
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }
          `}
        >
          {filter.label}
          {filter.count > 0 && (
            <span
              className={`
                inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold
                ${selectedFilter === filter.key
                  ? 'bg-white text-primary'
                  : 'bg-gray-300 text-gray-700'
                }
              `}
            >
              {filter.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  const renderOfferCard = (offer: Offer) => (
    <Card
      key={offer.id}
      hover
      className="mb-4"
      onClick={() => handleOfferClick(offer)}
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Left section: Offer details */}
        <div className="flex-1 min-w-0">
          {/* Header with title and status */}
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <h3 className="text-lg font-semibold text-text line-clamp-2 flex-1">
              {offer.need?.title || 'Ihtiyac'}
            </h3>
            <Badge variant={getStatusColor(offer.status)} size="md">
              <span className="flex items-center gap-1">
                {getStatusIcon(offer.status)}
                {getStatusText(offer.status)}
              </span>
            </Badge>
          </div>

          {/* Description */}
          <p className="text-text-secondary text-sm line-clamp-2 mb-4">
            {offer.description}
          </p>

          {/* Meta information */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1">
              <TruckIcon className="h-4 w-4" />
              {offer.deliveryDays} gun teslimat
            </span>
            <span className="flex items-center gap-1">
              <CalendarDaysIcon className="h-4 w-4" />
              {formatDate(offer.createdAt)}
            </span>
            {offer.need?.category && (
              <span className="flex items-center gap-1">
                <FolderOpenIcon className="h-4 w-4" />
                {offer.need.category.nameTr}
              </span>
            )}
          </div>
        </div>

        {/* Right section: Price and actions */}
        <div className="flex flex-col items-end gap-3 lg:min-w-[180px]">
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              {formatPrice(offer.price, offer.currency)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {offer.status === 'Pending' && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleWithdrawOffer(offer.id, e)}
                isLoading={withdrawingOfferId === offer.id}
              >
                Geri Cek
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowTopRightOnSquareIcon className="h-4 w-4" />}
              onClick={(e) => {
                e.stopPropagation();
                handleOfferClick(offer);
              }}
            >
              Detay
            </Button>
          </div>
        </div>
      </div>

      {/* Accepted offer info */}
      {offer.status === 'Accepted' && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">
              Teklifiniz kabul edildi! Alici ile iletisime gecebilirsiniz.
            </p>
          </div>
        </div>
      )}
    </Card>
  );

  const renderEmptyState = () => (
    <Card className="text-center py-12">
      <TagIcon className="h-16 w-16 text-text-secondary mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-text mb-2">
        {selectedFilter === 'all'
          ? 'Henuz teklif yok'
          : `${filterOptions.find(f => f.key === selectedFilter)?.label} teklif yok`
        }
      </h3>
      <p className="text-text-secondary mb-6 max-w-md mx-auto">
        {selectedFilter === 'all'
          ? 'Henuz hicbir ihtiyaca teklif vermediniz. Ihtiyaclara goz atin ve teklif verin.'
          : 'Bu durumda teklif bulunmuyor.'
        }
      </p>
      {selectedFilter === 'all' && (
        <Button
          variant="primary"
          onClick={() => navigate('/needs')}
        >
          Ihtiyaclara Goz At
        </Button>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Page Header */}
        <div className="bg-surface border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-text">
                  Tekliflerim
                </h1>
                <p className="text-text-secondary mt-1">
                  Verdiginiz teklifleri buradan takip edebilirsiniz
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                onClick={loadOffers}
                disabled={loading}
              >
                Yenile
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loading size="lg" text="Teklifler yukleniyor..." />
            </div>
          ) : error ? (
            <ErrorMessage
              message={error}
              onDismiss={() => setError(null)}
              className="mb-6"
            />
          ) : (
            <>
              {/* Filter Tabs */}
              {renderFilterTabs()}

              {/* Stats */}
              {filteredOffers.length > 0 && (
                <p className="text-sm text-text-secondary mb-4 text-center">
                  {filteredOffers.length} teklif gosteriliyor
                </p>
              )}

              {/* Offers List */}
              {filteredOffers.length === 0 ? (
                renderEmptyState()
              ) : (
                <div className="space-y-4">
                  {filteredOffers.map(renderOfferCard)}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MyOffersPage;
