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
import { needAPI, productAPI } from '../services/api';
import type { Need, ProductSummary } from '../services/api';
import { Header, Footer } from '../components/layout';
import AppDownloadBadges from '../components/AppDownloadBadges';
import NeedCard, { NeedCardSkeleton } from '../components/NeedCard';
import ProductCard from '../components/ProductCard';
import { useCategories } from '../utils/categoryVisual';

const RECENT_COUNT = 12;
const URGENT_COUNT = 6;

const HOW_IT_WORKS = [
  { title: 'İlan verin', text: 'Ne aradığınızı ve bütçenizi yazın. İlan vermek ücretsiz.' },
  { title: 'Teklifleri karşılaştırın', text: 'Satıcılar ilanınızı görür ve size teklif verir.' },
  { title: 'Anlaşın', text: 'Size uygun teklifi seçin, satıcıyla mesajlaşıp anlaşın.' },
];

const isShowcased = (need: Need) =>
  need.urgency === 'Urgent' && (!need.urgentUntil || new Date(need.urgentUntil) > new Date());

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // One-off confirmation passed via navigation state (e.g. after account deletion)
  const [flashMessage, setFlashMessage] = useState<string | null>(
    () => (location.state as { flash?: string } | null)?.flash ?? null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [urgentNeeds, setUrgentNeeds] = useState<Need[]>([]);
  const [recentNeeds, setRecentNeeds] = useState<Need[]>([]);
  const [isLoadingNeeds, setIsLoadingNeeds] = useState(true);
  const categories = useCategories();
  const [products, setProducts] = useState<ProductSummary[]>([]);

  useEffect(() => {
    productAPI
      .search('')
      .then((result) =>
        // The API sends only products with a live price, most sought first
        setProducts(result.filter((product) => product.realPrice != null).slice(0, 8))
      )
      .catch(() => {
        // The strip is simply not shown
      });
  }, []);
  const rootCategories = categories
    .filter((category) => !category.parentCategoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Drop the flash state so it does not reappear on refresh / back navigation
  useEffect(() => {
    if ((location.state as { flash?: string } | null)?.flash) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    const fetchNeeds = async () => {
      // The showcase is optional: the page still works if this request fails.
      const [urgentResult, recentResult] = await Promise.allSettled([
        needAPI.getNeeds({ urgency: 'Urgent', page: 1, pageSize: URGENT_COUNT }),
        needAPI.getNeeds({ page: 1, pageSize: RECENT_COUNT + URGENT_COUNT }),
      ]);

      const urgent = urgentResult.status === 'fulfilled' ? urgentResult.value.filter(isShowcased) : [];
      const urgentIds = new Set(urgent.map((need) => need.id));
      setUrgentNeeds(urgent);

      if (recentResult.status === 'fulfilled') {
        // Needs already shown in the showcase are not repeated below it
        setRecentNeeds(
          recentResult.value.filter((need) => !urgentIds.has(need.id)).slice(0, RECENT_COUNT)
        );
      } else {
        console.error('Error fetching needs:', recentResult.reason);
      }
      setIsLoadingNeeds(false);
    };

    fetchNeeds();
  }, []);

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
  const hasNoNeeds = !isLoadingNeeds && urgentNeeds.length === 0 && recentNeeds.length === 0;

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

        {/* Category chips */}
        {rootCategories.length > 0 && (
          <nav aria-label="Kategoriler" className="border-b border-border bg-surface">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <ul className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <li className="shrink-0">
                  <Link
                    to="/needs"
                    className="block rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white"
                  >
                    Tüm İlanlar
                  </Link>
                </li>
                {rootCategories.map((category) => (
                  <li key={category.id} className="shrink-0">
                    <Link
                      to={`/needs?categoryId=${category.id}`}
                      className="block rounded-full border border-border px-4 py-1.5 text-sm font-medium text-text transition-colors hover:border-primary hover:text-primary"
                    >
                      {category.nameTr || category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}

        {/* Urgent showcase */}
        {urgentNeeds.length > 0 && (
          <section aria-labelledby="urgent-heading" className="border-b border-[#F5DFB3] bg-[#FFF6E3]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2 id="urgent-heading" className="flex items-center gap-2 text-xl font-extrabold text-[#7C2D12]">
                    <FireIcon className="h-6 w-6 text-[#D97706]" aria-hidden="true" />
                    Acil İlanlar
                  </h2>
                  <p className="text-sm text-[#7C2D12]/80">Hemen teklif bekleyen ilanlar.</p>
                </div>
                <Link
                  to="/needs?urgency=Urgent"
                  className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#9A3412] hover:underline"
                >
                  Tümünü Gör
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                {urgentNeeds.map((need) => (
                  <li key={need.id} className="w-[85%] shrink-0 snap-start sm:w-[380px]">
                    <NeedCard need={need} />
                  </li>
                ))}
                <li className="w-[85%] shrink-0 snap-start sm:w-[380px]">
                  <Link
                    to={createNeedPath}
                    className="flex h-full min-h-[7.5rem] flex-col justify-center rounded-xl border-2 border-dashed border-[#E9B866] px-5 py-4 transition-colors hover:bg-[#FFEDC7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9A3412]"
                  >
                    <span className="font-bold text-[#7C2D12]">İlanınız burada yer alsın</span>
                    <span className="mt-1 text-sm text-[#7C2D12]/80">
                      İlan verirken “Acil”i seçin; ilanınız 7 gün boyunca en üstte görünsün.
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
          </section>
        )}

        {/* "Gerçek Fiyat": only products a buyer has named a price for; hidden until there is one */}
        {products.length > 0 && (
          <section aria-labelledby="prices-heading" className="border-b border-border bg-surface">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
              <h2 id="prices-heading" className="text-lg font-extrabold text-text">
                Alıcısı hazır ürünler
              </h2>
              <p className="mt-0.5 text-sm text-text-secondary">
                Bu fiyatlara şu an alıcı var. Elinizde varsa tek dokunuşla teklif verin.
              </p>
              <ul className="-mx-4 mt-3 flex snap-x gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                {products.map((product) => (
                  <li key={product.id} className="w-[85%] shrink-0 snap-start sm:w-[380px]">
                    <ProductCard product={product} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Recent needs */}
        <section aria-labelledby="recent-heading" className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 id="recent-heading" className="text-xl font-extrabold text-text">
                Son İlanlar
              </h2>
              <Link
                to="/needs"
                className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Tümünü Gör
                <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            {isLoadingNeeds ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <NeedCardSkeleton key={index} />
                ))}
              </div>
            ) : hasNoNeeds ? (
              <div className="rounded-xl border border-border bg-surface px-6 py-12 text-center">
                <p className="mb-4 text-text-secondary">
                  Henüz yayında ilan yok. İlk ilanı siz verin, satıcılar size teklif getirsin.
                </p>
                <Link
                  to={createNeedPath}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-white hover:bg-primary-dark"
                >
                  <PlusIcon className="h-5 w-5" aria-hidden="true" />
                  İlan Ver
                </Link>
              </div>
            ) : recentNeeds.length === 0 ? (
              <p className="text-text-secondary">Şu anda yayındaki tüm ilanlar acil ilanlar arasında.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {recentNeeds.map((need) => (
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
