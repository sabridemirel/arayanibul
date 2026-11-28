import React from 'react';
import { Link } from 'react-router-dom';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import type { ProductSummary } from '../services/api';
import { getCategoryVisual, useCategories } from '../utils/categoryVisual';

/**
 * A product buyers are waiting for, drawn like a listing card (NeedCard) so the home page shows one
 * kind of card. It stands for every live listing of the product and opens the product's price page.
 */
const ProductCard: React.FC<{ product: ProductSummary; className?: string }> = ({ product, className = '' }) => {
  const categories = useCategories();
  const visual = getCategoryVisual(product.categoryId, categories);
  const price = product.realPrice ? `${product.realPrice.toLocaleString('tr-TR')} TL` : null;
  const seekers = product.seekerCount === 1 ? '1 kişi arıyor' : `${product.seekerCount} kişi arıyor`;

  return (
    <Link
      to={`/fiyat/${product.slug}`}
      className={`group flex h-full gap-3.5 rounded-xl border border-border bg-surface p-3 transition-shadow duration-200 hover:border-purple-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
    >
      <div
        className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg sm:h-28 sm:w-28"
        style={{ backgroundColor: visual.background }}
      >
        <visual.Icon className="h-10 w-10" style={{ color: visual.foreground }} aria-hidden="true" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {product.categoryName && (
          <p className="truncate text-xs font-semibold" style={{ color: visual.foreground }}>
            {product.categoryName}
          </p>
        )}
        <h3 className="mt-0.5 line-clamp-2 font-semibold leading-snug text-text group-hover:text-primary">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-1 text-sm text-text-secondary">Elinizde varsa bu fiyata satın.</p>

        <div className="mt-auto pt-2">
          <p className={price ? 'font-bold text-primary' : 'text-sm text-text-secondary'}>
            {price ?? 'Teklife açık'}
            {price && (
              <span className="ml-2 rounded-full bg-primary-light px-2 py-0.5 align-middle text-xs font-semibold text-primary-dark">
                Hemen alır
              </span>
            )}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
            <UserGroupIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {seekers}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
