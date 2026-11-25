import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ClockIcon, MapPinIcon, ShareIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { productAPI } from '../services/api';
import type { ProductPage } from '../services/api';
import { clearReturnTo, rememberReturnTo } from '../utils/pendingNeedDraft';
import { Header, Footer } from '../components/layout';
import { Button, ErrorMessage, Input, Loading } from '../components/ui';

const tl = (value: number) => `${value.toLocaleString('tr-TR')} TL`;
const digitsOnly = (value: string) => value.replace(/\D/g, '');

const errorMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/**
 * "Gerçek Fiyat": one product, one number. The number is the highest price a buyer is offering for
 * the product right now. A seller accepts it with one tap; a buyer names their own price and sees
 * where that puts them.
 */
const ProductPricePage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isGuest } = useAuth();
  const isMember = isAuthenticated && !isGuest;

  const [page, setPage] = useState<ProductPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Buyer panel ("Ben de arıyorum"); it can be opened and pre-filled from the quick listing box
  const [isBidOpen, setIsBidOpen] = useState(searchParams.get('ara') === '1');
  const [bidPrice, setBidPrice] = useState(digitsOnly(searchParams.get('fiyat') ?? ''));
  const [bidAddress, setBidAddress] = useState(searchParams.get('konum') ?? '');
  const [isConfirmingSale, setIsConfirmingSale] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    clearReturnTo();
  }, []);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      setPage(await productAPI.getPage(slug));
      setNotFound(false);
    } catch (err: unknown) {
      if ((err as { response?: { status?: number } })?.response?.status === 404) setNotFound(true);
      else setLoadError('Fiyat sayfası yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    setIsLoading(true);
    void load();
  }, [load]);

  const realPrice = page?.realPrice ?? null;
  usePageMeta(
    page ? (realPrice ? `${page.name} ikinci el fiyatı: ${tl(realPrice)} veren var` : `${page.name} ikinci el gerçek fiyatı`) : undefined,
    page
      ? realPrice
        ? `${page.name} için şu an ${tl(realPrice)} veren alıcı var, ${page.seekerCount} kişi arıyor. Elinizde varsa tek dokunuşla bu fiyata satın.`
        : `${page.name} için henüz fiyat oluşmadı. İlk fiyatı siz verin.`
      : undefined,
    `/fiyat/${slug}`
  );

  /** Sends a visitor to sign up and brings them back to this page afterwards. */
  const askToSignIn = (params: string) => {
    rememberReturnTo(`/fiyat/${slug}${params}`);
    navigate('/register', { state: { guestNotice: true } });
  };

  const submitBid = async (withPrice: boolean) => {
    const price = withPrice && bidPrice ? Number(bidPrice) : undefined;
    if (withPrice && !price) {
      setActionError('Vermek istediğiniz fiyatı yazın ya da fiyatı satıcılara bırakın.');
      return;
    }
    if (!isMember) {
      const query = new URLSearchParams({ ara: '1' });
      if (price) query.set('fiyat', String(price));
      if (bidAddress.trim()) query.set('konum', bidAddress.trim());
      askToSignIn(`?${query.toString()}`);
      return;
    }

    setIsSaving(true);
    setActionError(null);
    try {
      const result = await productAPI.placeBid(slug, price, bidAddress.trim());
      setPage(result.page);
      setIsBidOpen(false);
      const mine = result.page.myListing;
      setNotice(
        !price
          ? 'İlanınız yayında. Satıcılar size kendi fiyatlarıyla teklif verecek.'
          : mine?.rank === 1
            ? `İlanınız yayında ve ${tl(price)} ile ilk sıradasınız. Elinde olan satıcı size bu fiyattan teklif verebilir.`
            : `İlanınız yayında, ${mine?.rank}. sıradasınız.${
                mine?.priceToLead ? ` ${tl(mine.priceToLead)} verirseniz ilk sıraya geçersiniz.` : ''
              }`
      );
    } catch (err: unknown) {
      setActionError(errorMessage(err, 'Fiyatınız kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmSale = async () => {
    setIsSaving(true);
    setActionError(null);
    try {
      const result = await productAPI.sell(slug);
      setIsConfirmingSale(false);
      setNotice(
        `Teklifiniz ${tl(result.price)} üzerinden alıcıya gönderildi. Alıcı ${page?.responseDays ?? 7} gün içinde yanıt verir; kabul ederse mesajlardan görüşebilirsiniz.`
      );
      await load();
    } catch (err: unknown) {
      setActionError(errorMessage(err, 'Teklifiniz gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'));
    } finally {
      setIsSaving(false);
    }
  };

  const share = async () => {
    if (!page) return;
    const url = `${window.location.origin}/fiyat/${page.slug}`;
    const text = realPrice
      ? `${page.name}'e ${tl(realPrice)} veren var, elinde olan dokunsun.`
      : `${page.name} arayanlar burada, elinde olan dokunsun.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: page.name, text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setNotice('Bağlantı kopyalandı.');
      }
    } catch {
      // Sharing was dismissed; nothing to report
    }
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-20">
          <Loading size="lg" text="Fiyat yükleniyor..." />
        </div>
      );
    }

    if (notFound || !page) {
      return (
        <div className="py-16 text-center">
          <h1 className="text-2xl font-bold text-text">{loadError ? 'Sayfa yüklenemedi' : 'Bu ürün için fiyat sayfası yok'}</h1>
          <p className="mx-auto mt-2 max-w-md text-text-secondary">
            {loadError ?? 'Aradığınızı ilan olarak yayınlayabilirsiniz; satıcılar size teklif getirir.'}
          </p>
          <Button className="mt-6" onClick={() => (loadError ? void load() : navigate('/create-need'))}>
            {loadError ? 'Tekrar Dene' : 'İlan Ver'}
          </Button>
        </div>
      );
    }

    const lastDeal = page.recentDeals[0];
    const mine = page.myListing;
    const sellTarget = page.sellTarget;
    const hasPricedBuyer = page.seekers.some((seeker) => seeker.price);

    return (
      <>
        <p className="text-sm font-semibold text-primary">{page.categoryName}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-text lg:text-3xl">{page.name} · ikinci el</h1>

        {/* The number */}
        <section
          aria-labelledby="price-heading"
          className="mt-5 rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white sm:p-8"
        >
          <h2 id="price-heading" className="text-sm font-semibold text-white/80">
            Gerçek fiyat
          </h2>
          {realPrice ? (
            <>
              <p className="mt-1 text-5xl font-black tracking-tight sm:text-6xl">{tl(realPrice)}</p>
              <p className="mt-2 text-lg font-semibold">Şu an bu fiyata alıcısı var</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-3xl font-black sm:text-4xl">Henüz fiyat oluşmadı</p>
              <p className="mt-2 text-lg font-semibold">İlk fiyatı siz verin</p>
            </>
          )}
          <p className="mt-3 text-sm text-white/80">
            {page.seekerCount > 0 ? `${page.seekerCount} kişi arıyor` : 'Henüz arayan yok'}
            {lastDeal && ` · son anlaşılan teklif ${tl(lastDeal.price)}`}
          </p>
        </section>

        {notice && (
          <p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900">
            {notice}
          </p>
        )}
        {actionError && <ErrorMessage message={actionError} onDismiss={() => setActionError(null)} className="mt-4" />}

        {/* The signed-in buyer's own place in the queue */}
        {mine && (
          <p className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text">
            {mine.price ? (
              <>
                Sizin fiyatınız <span className="font-bold">{tl(mine.price)}</span>, {mine.rank}. sıradasınız.
                {mine.priceToLead && <> {tl(mine.priceToLead)} verirseniz ilk sıraya geçersiniz.</>}
              </>
            ) : (
              'Bu ürün için fiyatsız bir ilanınız var; satıcılar kendi fiyatlarıyla teklif verebilir.'
            )}
          </p>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            onClick={() => {
              setNotice(null);
              setActionError(null);
              if (!isMember) {
                askToSignIn('');
                return;
              }
              setIsBidOpen(false);
              setIsConfirmingSale(true);
            }}
            disabled={isMember ? !sellTarget : !hasPricedBuyer}
          >
            Elimde Var, Bu Fiyata Satarım
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              setNotice(null);
              setActionError(null);
              setIsConfirmingSale(false);
              setIsBidOpen((open) => !open);
            }}
          >
            {mine ? 'Fiyatımı Değiştir' : 'Ben de Arıyorum'}
          </Button>
          <button
            type="button"
            onClick={share}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:ml-auto"
          >
            <ShareIcon className="h-5 w-5" aria-hidden="true" />
            Paylaş
          </button>
        </div>
        {isMember && !sellTarget && hasPricedBuyer && (
          <p className="mt-2 text-sm text-text-secondary">
            Fiyat veren alıcılara zaten teklif verdiniz ya da en yüksek fiyat sizin ilanınıza ait.
          </p>
        )}

        {/* Seller: confirm before the offer goes out */}
        {isConfirmingSale && sellTarget && (
          <section aria-labelledby="sell-heading" className="mt-4 rounded-xl border border-border bg-surface p-5">
            <h2 id="sell-heading" className="text-lg font-bold text-text">
              {tl(sellTarget.price)} üzerinden teklif veriyorsunuz
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {sellTarget.isTopPrice
                ? 'Teklifiniz en yüksek fiyatı veren alıcıya gidecek.'
                : 'En yüksek fiyatlı ilana teklif veremediğiniz için teklifiniz sıradaki alıcıya gidecek.'}{' '}
              Alıcı {page.responseDays} gün içinde yanıt verir. Fiyat, çalışır durumdaki temiz ürün içindir; ayrıntıları
              mesajlarda konuşursunuz. Teklif vermek ücretsizdir.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button onClick={confirmSale} isLoading={isSaving}>
                Teklifi Gönder
              </Button>
              <Button variant="outline" onClick={() => setIsConfirmingSale(false)} disabled={isSaving}>
                Vazgeç
              </Button>
            </div>
          </section>
        )}

        {/* Buyer: name a price */}
        {isBidOpen && (
          <section aria-labelledby="bid-heading" className="mt-4 rounded-xl border border-border bg-surface p-5">
            <h2 id="bid-heading" className="text-lg font-bold text-text">
              Bu ürüne kaç TL verirsiniz?
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Fiyatınız herkese açık görünür ve sıranızı belirler. İlanınız {page.listingDays} gün yayında kalır,
              sonra tek dokunuşla yenilersiniz.
            </p>

            {page.suggestedPrices.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Önerilen fiyatlar">
                {page.suggestedPrices.map((price) => (
                  <button
                    key={price}
                    type="button"
                    aria-pressed={bidPrice === String(price)}
                    onClick={() => setBidPrice(String(price))}
                    className={`min-h-11 rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      bidPrice === String(price)
                        ? 'border-primary bg-primary text-white'
                        : 'border-border text-text hover:border-primary'
                    }`}
                  >
                    {tl(price)}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                id="bid-price"
                label="Fiyatınız (TL)"
                inputMode="numeric"
                placeholder="Örneğin 15000"
                value={bidPrice}
                onChange={(event) => setBidPrice(digitsOnly(event.target.value))}
                fullWidth
              />
              <Input
                id="bid-address"
                label="Şehir"
                placeholder="İsteğe bağlı"
                value={bidAddress}
                onChange={(event) => setBidAddress(event.target.value)}
                leftIcon={<MapPinIcon className="h-5 w-5" aria-hidden="true" />}
                maxLength={100}
                fullWidth
              />
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button onClick={() => submitBid(true)} isLoading={isSaving}>
                Fiyatımı Yayınla
              </Button>
              <button
                type="button"
                onClick={() => submitBid(false)}
                disabled={isSaving}
                className="min-h-11 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Fiyatı satıcılar söylesin
              </button>
            </div>
          </section>
        )}

        {/* Everyone looking for it, best price first */}
        <section aria-labelledby="seekers-heading" className="mt-8">
          <h2 id="seekers-heading" className="text-xl font-extrabold text-text">
            Arayanlar
          </h2>
          {page.seekers.length === 0 ? (
            <p className="mt-2 text-text-secondary">Bu ürünü arayan ilk kişi siz olun.</p>
          ) : (
            <ol className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {page.seekers.map((seeker, index) => (
                <li key={seeker.needId} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 shrink-0 text-sm font-bold text-text-secondary" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={seeker.price ? 'font-bold text-text' : 'text-text-secondary'}>
                      {seeker.price ? tl(seeker.price) : 'Fiyatı satıcılar söylesin'}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 text-xs text-text-secondary">
                      {seeker.address && <span>{seeker.address}</span>}
                      {seeker.awaitingBuyerResponse && (
                        <span className="inline-flex items-center gap-1 font-semibold text-[#8A5A00]">
                          <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          Teklif aldı, yanıt bekleniyor
                        </span>
                      )}
                    </p>
                  </div>
                  <Link
                    to={`/needs/${seeker.needId}`}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {mine?.needId === seeker.needId ? 'İlanım' : 'Kendi Fiyatımla Teklif Ver'}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <p className="mt-6 text-sm text-text-secondary">
          Gerçek fiyat, bir alıcının bu ürün için şu an ödemeye hazır olduğunu söylediği en yüksek tutardır; çalışır
          durumdaki temiz ürün için geçerlidir. Bağlayıcı değildir ve ödeme Arayanibul üzerinden yapılmaz. Kapora
          isteyen kişiyi bildirin.
        </p>
      </>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">{renderBody()}</div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductPricePage;
