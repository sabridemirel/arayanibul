import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ImageLightboxProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
  /** Used in alt text, e.g. "İlan görseli" */
  label?: string;
}

const ZOOM = 2.5;
const SWIPE_THRESHOLD = 50;

/**
 * Full-screen photo viewer: arrows/keyboard/swipe to browse, click or double-tap to zoom at that
 * point, drag to pan while zoomed. Escape closes and focus returns to the opener.
 */
const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, startIndex, onClose, label = 'Görsel' }) => {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const hasMany = images.length > 1;

  const go = useCallback(
    (delta: number) => {
      setZoomed(false);
      setIndex(i => (i + delta + images.length) % images.length);
    },
    [images.length],
  );

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && hasMany) go(-1);
      else if (e.key === 'ArrowRight' && hasMany) go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [go, hasMany, onClose]);

  const originFromPoint = (target: HTMLElement, clientX: number, clientY: number) => {
    const rect = target.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const toggleZoom = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    if (zoomed) {
      setZoomed(false);
    } else {
      setOrigin(originFromPoint(e.currentTarget, e.clientX, e.clientY));
      setZoomed(true);
    }
  };

  // While zoomed, moving the pointer pans across the photo
  const pan = (e: React.PointerEvent<HTMLImageElement>) => {
    if (zoomed && e.pointerType !== 'touch') setOrigin(originFromPoint(e.currentTarget, e.clientX, e.clientY));
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchMove = (e: React.TouchEvent<HTMLImageElement>) => {
    if (zoomed && e.touches.length === 1) {
      setOrigin(originFromPoint(e.currentTarget, e.touches[0].clientX, e.touches[0].clientY));
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || zoomed || !hasMany) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  const navButton =
    'absolute top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={`${label} ${index + 1} / ${images.length}`}
      onClick={onClose}
    >
      <img
        src={images[index]}
        alt={`${label} ${index + 1}`}
        className={`max-h-full max-w-full select-none object-contain transition-transform duration-200 motion-reduce:transition-none ${
          zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
        }`}
        style={{ transform: zoomed ? `scale(${ZOOM})` : 'none', transformOrigin: `${origin.x}% ${origin.y}%` }}
        onClick={toggleZoom}
        onPointerMove={pan}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        draggable={false}
      />

      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        aria-label="Kapat"
      >
        <XMarkIcon className="h-6 w-6" />
      </button>

      {hasMany && (
        <>
          <button
            type="button"
            className={`${navButton} left-3 sm:left-6`}
            onClick={e => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Önceki görsel"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            className={`${navButton} right-3 sm:right-6`}
            onClick={e => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Sonraki görsel"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
            {index + 1} / {images.length}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
};

export default ImageLightbox;
