import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PlusCircleIcon,
  ArrowRightIcon,
  BuildingStorefrontIcon,
  HomeModernIcon,
  ComputerDesktopIcon,
  WrenchScrewdriverIcon,
  TruckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { searchAPI, categoryAPI } from '../services/api';
import type { Need, Category } from '../services/api';
import { Button, Card, Loading, Badge } from '../components/ui';
import { Header, Footer } from '../components/layout';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentNeeds, setRecentNeeds] = useState<Need[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingNeeds, setIsLoadingNeeds] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch recent/popular needs
        const needs = await searchAPI.getPopularNeeds();
        setRecentNeeds(needs.slice(0, 6));
      } catch (error) {
        console.error('Error fetching needs:', error);
      } finally {
        setIsLoadingNeeds(false);
      }

      try {
        // Fetch categories
        const cats = await categoryAPI.getCategories();
        setCategories(cats.slice(0, 6));
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/needs?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const getCategoryIcon = (index: number) => {
    const icons = [
      <BuildingStorefrontIcon className="h-8 w-8" />,
      <HomeModernIcon className="h-8 w-8" />,
      <ComputerDesktopIcon className="h-8 w-8" />,
      <WrenchScrewdriverIcon className="h-8 w-8" />,
      <TruckIcon className="h-8 w-8" />,
      <SparklesIcon className="h-8 w-8" />,
    ];
    return icons[index % icons.length];
  };

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

  const formatBudget = (need: Need) => {
    if (need.minBudget && need.maxBudget) {
      return `${need.minBudget.toLocaleString('tr-TR')} - ${need.maxBudget.toLocaleString('tr-TR')} ${need.currency}`;
    }
    if (need.maxBudget) {
      return `${need.maxBudget.toLocaleString('tr-TR')} ${need.currency}'ye kadar`;
    }
    if (need.minBudget) {
      return `${need.minBudget.toLocaleString('tr-TR')} ${need.currency}'den baslayan`;
    }
    return 'Belirtilmemis';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary to-primary-dark py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl lg:text-5xl font-bold text-white mb-4">
                Ne Ariyorsunuz?
              </h1>
              <p className="text-lg lg:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Arayanibul ile ihtiyacinizi ilan edin, saticilarin tekliflerini alin.
                Aradiginizi bulmak hic bu kadar kolay olmamisti!
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Ne ariyorsunuz? (ornegin: 'ikinci el bisiklet', 'ev tasima')"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-32 py-4 rounded-xl text-lg border-0 shadow-lg focus:ring-2 focus:ring-secondary-orange focus:outline-none"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    Ara
                  </Button>
                </div>
              </form>

              {/* CTA Button */}
              <Button
                variant="secondary"
                size="lg"
                leftIcon={<PlusCircleIcon className="h-5 w-5" />}
                onClick={() => {
                  if (isAuthenticated) {
                    navigate('/create-need');
                  } else {
                    navigate('/login');
                  }
                }}
              >
                Ucretsiz Ilan Ver
              </Button>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 bg-surface">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-text text-center mb-12">
              Nasil Calisir?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">
                  Ilaninizi Olusturun
                </h3>
                <p className="text-text-secondary">
                  Ne aradiginizi detayli bir sekilde aciklayin ve butcenizi belirleyin.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">
                  Teklifleri Alin
                </h3>
                <p className="text-text-secondary">
                  Saticilar ilaninizi gorup size en uygun tekliflerini sunar.
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">
                  Secin ve Anlasın
                </h3>
                <p className="text-text-secondary">
                  En uygun teklifi secin, saticiyla iletisime gecin ve anlasma yapin.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-16 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-text">
                Kategoriler
              </h2>
              <Link
                to="/categories"
                className="flex items-center gap-1 text-primary hover:text-primary-dark transition-colors"
              >
                Tumunu Gor
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>

            {isLoadingCategories ? (
              <div className="flex justify-center py-12">
                <Loading size="lg" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {categories.map((category, index) => (
                  <Link
                    key={category.id}
                    to={`/needs?categoryId=${category.id}`}
                    className="group"
                  >
                    <Card hover className="text-center">
                      <div className="text-primary group-hover:text-primary-dark transition-colors mb-2 flex justify-center">
                        {getCategoryIcon(index)}
                      </div>
                      <p className="font-medium text-text group-hover:text-primary transition-colors">
                        {category.nameTr || category.name}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Recent Needs Section */}
        <section className="py-16 bg-surface">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-text">
                Son Ilanlar
              </h2>
              <Link
                to="/needs"
                className="flex items-center gap-1 text-primary hover:text-primary-dark transition-colors"
              >
                Tumunu Gor
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>

            {isLoadingNeeds ? (
              <div className="flex justify-center py-12">
                <Loading size="lg" />
              </div>
            ) : recentNeeds.length === 0 ? (
              <Card className="text-center py-12">
                <p className="text-text-secondary mb-4">
                  Henuz ilan bulunmuyor. Ilk ilani siz verin!
                </p>
                <Button
                  variant="primary"
                  leftIcon={<PlusCircleIcon className="h-5 w-5" />}
                  onClick={() => navigate(isAuthenticated ? '/create-need' : '/login')}
                >
                  Ilan Ver
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentNeeds.map((need) => (
                  <Link key={need.id} to={`/needs/${need.id}`}>
                    <Card hover className="h-full">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-text line-clamp-2 flex-1">
                          {need.title}
                        </h3>
                        {getUrgencyBadge(need.urgency)}
                      </div>
                      <p className="text-text-secondary text-sm line-clamp-2 mb-4">
                        {need.description}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-primary font-medium">
                          {formatBudget(need)}
                        </span>
                        {need.offerCount !== undefined && need.offerCount > 0 && (
                          <Badge variant="primary">
                            {need.offerCount} teklif
                          </Badge>
                        )}
                      </div>
                      {need.address && (
                        <p className="text-text-secondary text-xs mt-2 truncate">
                          {need.address}
                        </p>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
              Aradiginizi Bulmaya Hazir misiniz?
            </h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto">
              Hemen ucretsiz kayit olun ve ihtiyacinizi dunyaya duyurun.
              Binlerce satici sizin icin en iyi teklifi sunmak icin bekliyor!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate(isAuthenticated ? '/create-need' : '/register')}
              >
                {isAuthenticated ? 'Ilan Ver' : 'Ucretsiz Kayit Ol'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="!border-white !text-white hover:!bg-white/10"
                onClick={() => navigate('/needs')}
              >
                Ilanlari Incele
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
