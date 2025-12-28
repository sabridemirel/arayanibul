import React from 'react';
import { Link } from 'react-router-dom';
import {
  MapPinIcon,
  CurrencyDollarIcon,
  TagIcon,
  UserIcon,
  StarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Card, Badge } from './ui';
import type { Need } from '../services/api';

interface NeedCardProps {
  need: Need;
  className?: string;
}

const NeedCard: React.FC<NeedCardProps> = ({ need, className = '' }) => {
  // Get urgency badge based on urgency level
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

  // Format budget display
  const formatBudget = (minBudget?: number, maxBudget?: number, currency = 'TRY') => {
    if (minBudget && maxBudget) {
      return `${minBudget.toLocaleString('tr-TR')} - ${maxBudget.toLocaleString('tr-TR')} ${currency}`;
    }
    if (maxBudget) {
      return `${maxBudget.toLocaleString('tr-TR')} ${currency}'ye kadar`;
    }
    if (minBudget) {
      return `${minBudget.toLocaleString('tr-TR')} ${currency}'den baslayan`;
    }
    return 'Belirtilmemis';
  };

  // Format relative date
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

  return (
    <Link to={`/needs/${need.id}`} className={`block ${className}`}>
      <Card
        hover
        className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary/30"
      >
        {/* Header: Title and Urgency Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-text text-lg line-clamp-2 flex-1 group-hover:text-primary transition-colors">
            {need.title}
          </h3>
          {getUrgencyBadge(need.urgency)}
        </div>

        {/* Description */}
        <p className="text-text-secondary text-sm line-clamp-2 mb-4">
          {need.description}
        </p>

        {/* Meta Information */}
        <div className="space-y-2 mb-4">
          {/* Category */}
          {need.category && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <TagIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{need.category.nameTr || need.category.name}</span>
            </div>
          )}

          {/* Location */}
          {need.address && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <MapPinIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{need.address}</span>
            </div>
          )}

          {/* Budget */}
          <div className="flex items-center gap-2 text-sm">
            <CurrencyDollarIcon className="h-4 w-4 flex-shrink-0 text-primary" />
            <span className="font-medium text-primary">
              {formatBudget(need.minBudget, need.maxBudget, need.currency)}
            </span>
          </div>
        </div>

        {/* Footer: User Info and Date */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          {/* User Info */}
          <div className="flex items-center gap-2">
            {need.user?.profileImageUrl ? (
              <img
                src={need.user.profileImageUrl}
                alt={`${need.user.firstName} ${need.user.lastName}`}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <UserIcon className="h-5 w-5 text-text-secondary" />
            )}
            <div className="flex items-center gap-1">
              <span className="text-sm text-text-secondary">
                {need.user?.firstName} {need.user?.lastName}
              </span>
              {need.user?.rating && need.user.rating > 0 && (
                <div className="flex items-center gap-0.5 ml-1">
                  <StarIcon className="h-3.5 w-3.5 text-secondary-orange fill-secondary-orange" />
                  <span className="text-xs text-text-secondary">
                    {need.user.rating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Date and Offers */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-text-secondary">
              <ClockIcon className="h-3.5 w-3.5" />
              <span>{formatDate(need.createdAt)}</span>
            </div>
            {need.offerCount !== undefined && need.offerCount > 0 && (
              <Badge variant="primary" size="sm">
                {need.offerCount} teklif
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};

// Skeleton component for loading state
export const NeedCardSkeleton: React.FC = () => {
  return (
    <Card className="h-full animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-14" />
      </div>

      {/* Description skeleton */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>

      {/* Meta skeleton */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-2/5" />
      </div>

      {/* Footer skeleton */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-200 rounded-full" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
        <div className="h-4 bg-gray-200 rounded w-20" />
      </div>
    </Card>
  );
};

export default NeedCard;
