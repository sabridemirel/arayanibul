import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  FunnelIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassCircleIcon,
} from '@heroicons/react/24/outline';
import { Header, Footer } from '../components/layout';
import { Button, Card, Loading } from '../components/ui';
import NeedCard, { NeedCardSkeleton } from '../components/NeedCard';
import { searchAPI, categoryAPI } from '../services/api';
import type { Need, Category, NeedFilters } from '../services/api';

const ITEMS_PER_PAGE = 12;

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [needs, setNeeds] = useState<Need[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter state
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(
    searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!) : undefined
  );
  const [minBudget, setMinBudget] = useState<string>(searchParams.get('minBudget') || '');
  const [maxBudget, setMaxBudget] = useState<string>(searchParams.get('maxBudget') || '');
  const [urgency, setUrgency] = useState<string>(searchParams.get('urgency') || '');

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await categoryAPI.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Kategoriler yuklenirken hata:', err);
      }
    };
    loadCategories();
  }, []);

  // Build filters object
  const buildFilters = useCallback((): NeedFilters => {
    const filters: NeedFilters = {
      page: currentPage,
      pageSize: ITEMS_PER_PAGE,
    };

    if (selectedCategoryId) filters.categoryId = selectedCategoryId;
    if (minBudget) filters.minBudget = parseInt(minBudget);
    if (maxBudget) filters.maxBudget = parseInt(maxBudget);
    if (urgency) filters.urgency = urgency;
    if (searchQuery.trim()) filters.search = searchQuery.trim();

    return filters;
  }, [selectedCategoryId, minBudget, maxBudget, urgency, searchQuery, currentPage]);

  // Perform search
  const performSearch = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const filters = buildFilters();
      filters.page = page;

      const results = await searchAPI.search(searchQuery.trim(), filters);

      if (append) {
        setNeeds(prev => [...prev, ...results]);
      } else {
        setNeeds(results);
      }

      setHasMore(results.length === ITEMS_PER_PAGE);
      setCurrentPage(page);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Arama yapilirken hata olustu';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [buildFilters, searchQuery]);

  // Initial load and URL param changes
  useEffect(() => {
    performSearch(1, false);
  }, [selectedCategoryId, minBudget, maxBudget, urgency]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle search form submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateURLParams();
    performSearch(1, false);
  };

  // Update URL params
  const updateURLParams = useCallback(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (selectedCategoryId) params.set('categoryId', selectedCategoryId.toString());
    if (minBudget) params.set('minBudget', minBudget);
    if (maxBudget) params.set('maxBudget', maxBudget);
    if (urgency) params.set('urgency', urgency);
    setSearchParams(params);
  }, [searchQuery, selectedCategoryId, minBudget, maxBudget, urgency, setSearchParams]);

  // Load more results
  const handleLoadMore = () => {
    performSearch(currentPage + 1, true);
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategoryId(undefined);
    setMinBudget('');
    setMaxBudget('');
    setUrgency('');
    setSearchQuery('');
    setSearchParams(new URLSearchParams());
    setCurrentPage(1);
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCategoryId) count++;
    if (minBudget || maxBudget) count++;
    if (urgency) count++;
    return count;
  };

  // Urgency options
  const urgencyOptions = [
    { value: '', label: 'Tumu' },
    { value: 'Urgent', label: 'Acil' },
    { value: 'Normal', label: 'Normal' },
    { value: 'Flexible', label: 'Esnek' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Search Header */}
        <section className="bg-surface border-b border-border py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-text mb-4">
              Ilanlar
            </h1>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Ilan ara... (ornegin: 'ikinci el bisiklet', 'ev tasima')"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-border bg-background text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              <Button type="submit" variant="primary">
                Ara
              </Button>
              <Button
                type="button"
                variant={getActiveFilterCount() > 0 ? 'secondary' : 'outline'}
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
                <span className="hidden sm:inline ml-2">Filtrele</span>
                {getActiveFilterCount() > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-xs font-semibold rounded-full flex items-center justify-center">
                    {getActiveFilterCount()}
                  </span>
                )}
              </Button>
            </form>
          </div>
        </section>

        {/* Filters Panel */}
        {showFilters && (
          <section className="bg-surface border-b border-border py-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5 text-primary" />
                  <span className="font-medium text-text">Filtreler</span>
                </div>
                {getActiveFilterCount() > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-primary hover:text-primary-dark transition-colors"
                  >
                    Filtreleri Temizle
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Kategori
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCategoryId || ''}
                      onChange={(e) => setSelectedCategoryId(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    >
                      <option value="">Tum Kategoriler</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nameTr || cat.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary pointer-events-none" />
                  </div>
                </div>

                {/* Budget Range */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Butce Araligi (TRY)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={minBudget}
                      onChange={(e) => setMinBudget(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                    <span className="text-text-secondary">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={maxBudget}
                      onChange={(e) => setMaxBudget(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                {/* Urgency Filter */}
                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Aciliyet Durumu
                  </label>
                  <div className="relative">
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-text appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    >
                      {urgencyOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary pointer-events-none" />
                  </div>
                </div>

                {/* Apply Filters Button */}
                <div className="flex items-end">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => {
                      updateURLParams();
                      performSearch(1, false);
                    }}
                  >
                    Filtreleri Uygula
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Results Section */}
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Results Count */}
            {!isLoading && !error && (
              <p className="text-text-secondary mb-6">
                {needs.length === 0 ? (
                  'Sonuc bulunamadi'
                ) : (
                  <>
                    <span className="font-medium text-text">{needs.length}</span> ilan bulundu
                    {searchQuery && (
                      <> - "<span className="font-medium">{searchQuery}</span>" icin</>
                    )}
                  </>
                )}
              </p>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <NeedCardSkeleton key={index} />
                ))}
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <Card className="py-12 text-center">
                <ExclamationTriangleIcon className="h-16 w-16 text-error mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-text mb-2">
                  Bir hata olustu
                </h3>
                <p className="text-text-secondary mb-6 max-w-md mx-auto">
                  {error}
                </p>
                <Button
                  variant="primary"
                  onClick={() => performSearch(1, false)}
                >
                  Tekrar Dene
                </Button>
              </Card>
            )}

            {/* Empty State */}
            {!isLoading && !error && needs.length === 0 && (
              <Card className="py-12 text-center">
                <MagnifyingGlassCircleIcon className="h-16 w-16 text-text-secondary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-text mb-2">
                  Sonuc bulunamadi
                </h3>
                <p className="text-text-secondary mb-6 max-w-md mx-auto">
                  Arama kriterlerinize uygun ilan bulunamadi. Farkli kelimeler deneyin veya filtreleri degistirin.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                  >
                    Filtreleri Temizle
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => navigate('/create-need')}
                  >
                    Ilan Olustur
                  </Button>
                </div>
              </Card>
            )}

            {/* Results Grid */}
            {!isLoading && !error && needs.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {needs.map((need) => (
                    <NeedCard key={need.id} need={need} />
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="mt-8 text-center">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <Loading size="sm" />
                          <span className="ml-2">Yukleniyor...</span>
                        </>
                      ) : (
                        'Daha Fazla Goster'
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SearchPage;
