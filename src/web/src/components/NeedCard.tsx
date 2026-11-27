import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { FireIcon } from '@heroicons/react/24/solid';
import { resolveMediaUrl } from '../services/api';
import type { Need } from '../services/api';
import { getCategoryVisual, useCategories } from '../utils/categoryVisual';

interface NeedCardProps {
  need: Need;
  className?: string;
}

const formatBudget = (minBudget?: number, maxBudget?: number, currency = 'TRY'): string | null => {
  const unit = currency === 'TRY' ? 'TL' : currency;
  const format = (value: number) => value.toLocaleString('tr-TR');
  if (minBudget && maxBudget) {
    return minBudget === maxBudget
      ? `${format(maxBudget)} ${unit}`
      : `${format(minBudget)} – ${format(maxBudget)} ${unit}`;
  }
  if (maxBudget) return `En fazla ${format(maxBudget)} ${unit}`;
  if (minBudget) return `En az ${format(minBudget)} ${unit}`;
  return null;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const diffInHours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return 'Az önce';
  if (diffInHours < 24) return `${diffInHours} saat önce`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} gün önce`;

  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

/**
 * Listing card used on the home page and in search results.
 * The square on the left is the first photo, or a category-coloured tile when the need has none,
 * so cards line up whether or not a photo was added.
 */
const NeedCard: React.FC<NeedCardProps> = ({ need, className = '' }) => {
  const categories = useCategories();
  const visual = getCategoryVisual(need.categoryId, categories);
  // A photo that fails to load falls back to the category tile
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = photoFailed ? undefined : need.images?.[0];
  const isUrgent = need.urgency === 'Urgent';
  const isFixedPrice = Boolean(need.isFixedPrice && need.maxBudget);
  const budget = isFixedPrice
    ? `${need.maxBudget!.toLocaleString('tr-TR')} TL`
    : formatBudget(need.minBudget, need.maxBudget, need.currency);
  const categoryName = need.category?.nameTr || need.category?.name;
  const offerCount = need.offerCount ?? 0;

  return (
    <Link
      to={`/needs/${need.id}`}
      className={`group flex h-full gap-3.5 rounded-xl border bg-surface p-3 transition-shadow duration-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        isUrgent ? 'border-secondary-orange/60' : 'border-border hover:border-purple-200'
      } ${className}`}
    >
      <div
        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg sm:h-28 sm:w-28"
        style={photo ? undefined : { backgroundColor: visual.background }}
      >
        {photo ? (
          <img
            src={resolveMediaUrl(photo.imageUrl)}
            alt=""
            loading="lazy"
            onError={() => setPhotoFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <visual.Icon className="h-10 w-10" style={{ color: visual.foreground }} aria-hidden="true" />
          </div>
        )}
        {isUrgent && (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-md bg-[#B45309] px-1.5 py-0.5 text-xs font-bold text-white">
            <FireIcon className="h-3 w-3" aria-hidden="true" />
            Acil
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {categoryName && (
          <p className="truncate text-xs font-semibold" style={{ color: visual.foreground }}>
            {categoryName}
          </p>
        )}
        <h3 className="mt-0.5 line-clamp-2 font-semibold leading-snug text-text group-hover:text-primary">
          {need.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-sm text-text-secondary">{need.description}</p>

        <div className="mt-auto pt-2">
          <p className={budget ? 'font-bold text-primary' : 'text-sm text-text-secondary'}>
            {budget ?? 'Teklife açık'}
            {isFixedPrice && (
              <span className="ml-2 rounded-full bg-primary-light px-2 py-0.5 align-middle text-xs font-semibold text-primary-dark">
                Hemen alır
              </span>
            )}
          </p>
          <div className="mt-1 flex items-center justify-between gap-2 text-xs text-text-secondary">
            <span className="flex min-w-0 items-center gap-1">
              {need.address && (
                <>
                  <MapPinIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{need.address}</span>
                </>
              )}
            </span>
            <span className="shrink-0">
              {offerCount > 0 && (
                <span className="mr-2 font-semibold text-primary">{offerCount} teklif</span>
              )}
              {formatDate(need.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

// Skeleton component for loading state
export const NeedCardSkeleton: React.FC = () => {
  return (
    <div className="flex h-full animate-pulse gap-3.5 rounded-xl border border-border bg-surface p-3">
      <div className="h-24 w-24 shrink-0 rounded-lg bg-purple-100 sm:h-28 sm:w-28" />
      <div className="flex flex-1 flex-col gap-2 py-1">
        <div className="h-3 w-1/3 rounded bg-purple-100" />
        <div className="h-4 w-3/4 rounded bg-purple-100" />
        <div className="h-3 w-full rounded bg-purple-100" />
        <div className="mt-auto h-4 w-2/5 rounded bg-purple-100" />
      </div>
    </div>
  );
};

export default NeedCard;
