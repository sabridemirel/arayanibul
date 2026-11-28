import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { FireIcon } from '@heroicons/react/24/solid';
import { needAPI } from '../services/api';
import type { Need } from '../services/api';
import { Header, Footer } from '../components/layout';
import AppDownloadBadges from '../components/AppDownloadBadges';
import NeedCard, { NeedCardSkeleton } from '../components/NeedCard';

const LISTING_COUNT = 12;

const chipClass = (selected: boolean) =>
  `inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
    selected
      ? 'border-primary bg-primary text-white'
      : 'border-border bg-surface text-text hover:border-primary hover:text-primary'
  }`;

const HOW_IT_WORKS = [
  { title: 'İlan verin', text: 'Ne aradığınızı yazın; isterseniz hemen alacağınız fiyatı da belirtin. İlan vermek ücretsiz.' },
  { title: 'Teklifleri karşılaştırın', text: 'Satıcılar ilanınızı görür ve size teklif verir.' },
  { title: 'Anlaşın', text: 'Size uygun teklifi seçin, satıcıyla mesajlaşıp anlaşın.' },
];

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // One-off confirmation passed via navigation state (e.g. after account deletion)
  const [flashMessage, setFlashMessage] = useState<string | null>(
    () => (location.state as { flash?: string } | null)?.flash ?? null
  );
  const [searchQuery, setSearchQuery] = useState('');
  // Kind filter: both on = urgent "hemen alır" listings
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [fixedOnly, setFixedOnly] = useState(false);
  const filterKey = `${urgentOnly}-${fixedOnly}`;
  // The list and the filter it was loaded for; a different key means it is still loading
  const [loaded, setLoaded] = useState<{ key: string; needs: Need[] } | null>(null);
  const isLoadingNeeds = loaded?.key !== filterKey;
  const needs = loaded?.needs ?? [];

  // Drop the flash state so it does not reappear on refresh / back navigation
  useEffect(() => {
    if ((location.state as { flash?: string } | null)?.flash) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    let cancelled = false;
    const key = `${urgentOnly}-${fixedOnly}`;
    // Showcased urgent listings come first in the API's default order
    needAPI
      .getNeeds({
        page: 1,
        pageSize: LISTING_COUNT,
        urgency: urgentOnly ? 'Urgent' : undefined,
        isFixedPrice: fixedOnly ? true : undefined,
      })
      .then((result) => {
        if (!cancelled) setLoaded({ key, needs: result });
      })
      .catch((error) => {
        console.error('Error fetching needs:', error);
        if (!cancelled) setLoaded({ key, needs: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [urgentOnly, fixedOnly]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      navigate('/needs');
      return;
    }

    // A catalogued product has its own price page; everything else goes to the listing search.
    try {
      const draft = await needAPI.buildDraft(query);
      if (draft.productSlug) {
        navigate(`/fiyat/${draft.productSlug}`);
        return;
      }
    } catch {
      // The search below still works without product recognition
    }
    navigate(`/needs?search=${encodeURIComponent(query)}`);
  };

  // Anyone can start writing a listing; signing in is asked for when publishing
  const createNeedPath = '/create-need';
  const allListingsParams = new URLSearchParams();
  if (urgentOnly) allListingsParams.set('urgency', 'Urgent');
  if (fixedOnly) allListingsParams.set('isFixedPrice', 'true');
  const allListingsPath = allListingsParams.size ? `/needs?${allListingsParams}` : '/needs';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {flashMessage && (
          <div className="bg-green-50 border-b border-green-200" role="status">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
              <CheckCircleIcon className="h-5 w-5 text-success flex-shrink-0" />
              <p className="flex-1 text-sm text-green-900">{flashMessage}</p>
              <button
                type="button"
                onClick={() => setFlashMessage(null)}
                className="text-green-900/70 hover:text-green-900"
                aria-label="Kapat"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Search band */}
        <section className="bg-gradient-to-br from-primary to-primary-dark">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white">
              Arayanı bulun, teklifinizi verin
            </h1>
            <p className="mt-1 text-white/80 max-w-2xl">
              İnsanlar ne aradığını yazar, satıcılar teklif verir. İlan vermek ücretsiz.
            </p>

            <div className="mt-5 flex flex-col gap-3 md:flex-row">
              <form onSubmit={handleSearch} className="flex flex-1 rounded-xl bg-white p-1.5 shadow-lg" role="search">
                <label htmlFor="home-search" className="sr-only">
                  İlanlarda arayın
                </label>
                <div className="flex flex-1 items-center gap-2 pl-3">
                  <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-text-secondary" aria-hidden="true" />
                  <input
                    id="home-search"
                    type="search"
                    placeholder="İlanlarda arayın: temizlik, laptop, nakliye…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full min-w-0 border-0 bg-transparent py-2.5 text-base text-text placeholder:text-text-secondary focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Ara
                </button>
              </form>

              <Link
                to={createNeedPath}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary-orange px-6 py-3 font-bold text-[#3c0764] shadow-lg transition-colors hover:bg-[#FBBF24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <PlusIcon className="h-5 w-5 stroke-2" aria-hidden="true" />
                İlan Ver
              </Link>
            </div>
          </div>
        </section>

        {/* Listings: one list for all four kinds, narrowed with the kind filter */}
        <section aria-labelledby="listings-heading" className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <h2 id="listings-heading" className="text-xl font-extrabold text-text">
                İlanlar
              </h2>
              <Link
                to={allListingsPath}
                className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Tümünü Gör
                <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div role="group" aria-label="İlan türü" className="mb-5 flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={!urgentOnly && !fixedOnly}
                onClick={() => {
                  setUrgentOnly(false);
                  setFixedOnly(false);
                }}
                className={chipClass(!urgentOnly && !fixedOnly)}
              >
                Tümü
              </button>
              <button
                type="button"
                aria-pressed={urgentOnly}
                onClick={() => setUrgentOnly((value) => !value)}
                className={chipClass(urgentOnly)}
              >
                <FireIcon className="h-4 w-4" aria-hidden="true" />
                Acil
              </button>
              <button
                type="button"
                aria-pressed={fixedOnly}
                onClick={() => setFixedOnly((value) => !value)}
                className={chipClass(fixedOnly)}
              >
                Hemen alır
              </button>
            </div>

            {isLoadingNeeds ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <NeedCardSkeleton key={index} />
                ))}
              </div>
            ) : needs.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center">
                <p className="mb-4 text-text-secondary">
                  {urgentOnly || fixedOnly
                    ? 'Bu türde yayında ilan yok. Filtreyi kaldırıp tüm ilanlara bakabilir ya da kendi ilanınızı verebilirsiniz.'
                    : 'Henüz yayında ilan yok. İlk ilanı siz verin, satıcılar size teklif getirsin.'}
                </p>
                <Link
                  to={createNeedPath}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-white hover:bg-primary-dark"
                >
                  <PlusIcon className="h-5 w-5" aria-hidden="true" />
                  İlan Ver
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {needs.map((need) => (
                  <NeedCard key={need.id} need={need} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* How it works (compact) */}
        <section aria-labelledby="how-heading" className="border-t border-border bg-surface py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 id="how-heading" className="text-xl font-extrabold text-text">
              Nasıl çalışır?
            </h2>
            <p className="mb-4 mt-1 max-w-3xl text-sm text-text-secondary">
              Arayanibul bir ters pazar yeridir: klasik ilan sitelerinin tersine ilanı alıcı verir,
              satıcılar teklifle gelir.
            </p>
            <ol className="grid gap-4 md:grid-cols-3">
              {HOW_IT_WORKS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-text">{step.title}</h3>
                    <p className="text-sm text-text-secondary">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Mobile App Section */}
        <section className="py-16 bg-background" aria-labelledby="mobile-app-heading">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5A189A] to-[#3c0764] px-6 pt-10 sm:px-12 lg:px-16 lg:pt-0">
              <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
                <div className="lg:py-16">
                  <img
                    src="/assets/app-icon.png"
                    alt=""
                    className="mb-6 h-16 w-16 rounded-2xl shadow-lg ring-1 ring-white/20"
                  />
                  <h2
                    id="mobile-app-heading"
                    className="text-3xl lg:text-4xl font-extrabold text-white mb-4 leading-tight"
                  >
                    ArayanıBUL artık iPhone'da
                  </h2>
                  <p className="text-white/75 text-lg mb-8 max-w-md leading-relaxed">
                    İlan verin, gelen teklifleri karşılaştırın, satıcılarla mesajlaşın. Hepsi
                    telefonunuzdan, aynı hesapla.
                  </p>
                  <AppDownloadBadges />
                </div>

                {/* Phone: rises from the bottom edge of the panel */}
                <div className="relative mx-auto h-[360px] w-[250px] sm:h-[420px] sm:w-[280px] lg:h-[460px]">
                  <div
                    className="absolute -right-16 top-24 h-64 w-64 rounded-full bg-[#F59E0B] sm:-right-24 sm:h-80 sm:w-80"
                    aria-hidden="true"
                  />
                  <div className="absolute inset-x-0 top-0 -rotate-[4deg] rounded-t-[2.6rem] border-[10px] border-b-0 border-[#1a0530] bg-[#1a0530] shadow-2xl lg:top-8">
                    <img
                      src="/assets/app-screen-home.webp"
                      alt="ArayanıBUL iPhone uygulamasında ilan listesi"
                      className="block w-full rounded-t-[2rem]"
                      loading="lazy"
                      width={540}
                      height={1173}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
