import React from 'react';

export const APP_STORE_URL = 'https://apps.apple.com/tr/app/id6834834670';

interface AppDownloadBadgesProps {
  size?: 'md' | 'sm';
  className?: string;
}

/**
 * iOS: Apple'ın resmi Türkçe rozeti (değiştirilmeden kullanılmalı).
 * Android: Play'de yayında olmadığı için resmi Google Play rozeti kullanılamaz;
 * yerine tıklanamayan bir "Yakında" kutusu gösterilir.
 */
const AppDownloadBadges: React.FC<AppDownloadBadgesProps> = ({ size = 'md', className = '' }) => {
  const height = size === 'md' ? 'h-12' : 'h-10';

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B]"
      >
        <img
          src="/assets/app-store-badge-tr.svg"
          alt="App Store'dan İndirin"
          className={`${height} w-auto`}
        />
      </a>

      <div
        className={`${height} inline-flex items-center gap-2.5 rounded-lg border border-dashed border-white/40 px-3.5 text-white/70 select-none`}
        aria-label="Google Play sürümü yakında"
        role="note"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true" fill="currentColor">
          <path d="M4 3.5v17a.5.5 0 0 0 .76.43L19.5 12.4a.5.5 0 0 0 0-.86L4.76 3.07A.5.5 0 0 0 4 3.5Z" opacity=".85" />
        </svg>
        <span className="flex flex-col leading-tight">
          <span className="text-[11px]">Google Play</span>
          <span className="text-sm font-bold text-[#FBBF24]">Yakında</span>
        </span>
      </div>
    </div>
  );
};

export default AppDownloadBadges;
