import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  PhotoIcon,
  TagIcon,
  XMarkIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { Badge, Button, Card, Loading } from '../../components/ui';
import { adminAPI } from '../../services/moderation';
import type { AdminNeedItem, ModerationReason } from '../../services/moderation';
import { getApiErrorMessage, resolveMediaUrl } from '../../services/api';
import { useAdmin } from './adminContext';
import { Highlighted, LoadError, ReasonDialog } from './AdminWidgets';
import { formatBudget, formatDate, formatDateTime, formatRelative, URGENCY_LABELS } from './format';

const sortQueue = (items: AdminNeedItem[]) =>
  [...items].sort((a, b) => {
    const flagDiff = Number(b.flaggedTerms.length > 0) - Number(a.flaggedTerms.length > 0);
    if (flagDiff !== 0) return flagDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

const isTypingTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
};

// ---------- lightbox ----------

interface LightboxProps {
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ images, index, onIndexChange, onClose }) => {
  const count = images.length;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndexChange((index + 1) % count);
      if (e.key === 'ArrowLeft') onIndexChange((index - 1 + count) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, count, onIndexChange, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Görsel önizleme"
      data-modal-open="true"
    >
      <img
        src={images[index]}
        alt={`Görsel ${index + 1}`}
        className="max-h-full max-w-full object-contain rounded"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Kapat"
      >
        <XMarkIcon className="h-6 w-6" />
      </button>
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index - 1 + count) % count);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Önceki görsel"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index + 1) % count);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Sonraki görsel"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
            {index + 1} / {count}
          </span>
        </>
      )}
    </div>
  );
};

// ---------- detail ----------

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded border border-border bg-background text-[11px] font-mono text-text-secondary">
    {children}
  </kbd>
);

interface DetailProps {
  item: AdminNeedItem;
  onApprove: () => void;
  onReject: () => void;
  onOpenImage: (index: number) => void;
}

const NeedReviewDetail: React.FC<DetailProps> = ({ item, onApprove, onReject, onOpenImage }) => {
  const owner = item.user;
  return (
    <Card padding="lg" className="h-full overflow-y-auto">
      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pb-4 mb-4 border-b border-border">
        <Button onClick={onApprove} leftIcon={<CheckIcon className="h-5 w-5" />}>
          Onayla
        </Button>
        <Button variant="outline" onClick={onReject} className="!border-error !text-error hover:!bg-red-50">
          Reddet
        </Button>
        <div className="ml-auto hidden lg:flex items-center gap-3 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <Kbd>A</Kbd> onayla
          </span>
          <span className="flex items-center gap-1">
            <Kbd>R</Kbd> reddet
          </span>
          <span className="flex items-center gap-1">
            <Kbd>J</Kbd>
            <Kbd>K</Kbd> sonraki / önceki
          </span>
        </div>
      </div>

      {item.flaggedTerms.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 mb-4">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">İşaretlenen ifadeler</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {item.flaggedTerms.map((term) => (
                <span key={term} className="rounded bg-amber-200 px-1.5 py-0.5 text-xs font-medium">
                  {term}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Images */}
      {item.images.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {item.images.map((img, index) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onOpenImage(index)}
              className="flex-shrink-0 w-28 h-28 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={`Görsel ${index + 1} büyüt`}
            >
              <img src={resolveMediaUrl(img.imageUrl)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <PhotoIcon className="h-5 w-5" />
          Görsel eklenmemiş
        </div>
      )}

      <h2 className="text-xl font-bold text-text mb-2 break-words">
        <Highlighted text={item.title} terms={item.flaggedTerms} />
      </h2>
      <p className="text-text leading-relaxed whitespace-pre-wrap break-words mb-5">
        <Highlighted text={item.description} terms={item.flaggedTerms} />
      </p>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm mb-6">
        <div className="flex items-center gap-2">
          <TagIcon className="h-4 w-4 text-text-secondary" />
          <dt className="sr-only">Kategori</dt>
          <dd className="text-text">{item.categoryName || 'Kategori yok'}</dd>
        </div>
        <div className="flex items-center gap-2">
          <CurrencyDollarIcon className="h-4 w-4 text-text-secondary" />
          <dt className="sr-only">Bütçe</dt>
          <dd className="text-text">{formatBudget(item.minBudget, item.maxBudget, item.currency)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <MapPinIcon className="h-4 w-4 text-text-secondary" />
          <dt className="sr-only">Konum</dt>
          <dd className="text-text">
            <Highlighted text={item.address || 'Konum belirtilmemiş'} terms={item.flaggedTerms} />
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <BoltIcon className="h-4 w-4 text-text-secondary" />
          <dt className="sr-only">Aciliyet</dt>
          <dd className="text-text">{URGENCY_LABELS[item.urgency ?? ''] ?? item.urgency ?? 'Normal'}</dd>
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <ClockIcon className="h-4 w-4 text-text-secondary" />
          <dt className="sr-only">Oluşturulma</dt>
          <dd className="text-text">
            {formatDateTime(item.createdAt)}{' '}
            <span className="text-text-secondary">({formatRelative(item.createdAt)})</span>
          </dd>
        </div>
      </dl>

      {/* Owner card */}
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <p className="font-semibold text-text">{owner?.fullName || 'Kullanıcı'}</p>
          {owner?.isSuspended && <Badge variant="error">Askıda</Badge>}
        </div>
        <p className="text-sm text-text-secondary break-all">{owner?.email}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm">
          <span className="text-text-secondary">
            Üyelik: <span className="text-text">{formatDate(owner?.createdAt)}</span>
          </span>
          <span className="text-text-secondary">
            Toplam ilan: <span className="text-text font-medium">{owner?.totalNeeds ?? 0}</span>
          </span>
          <span className="text-text-secondary">
            Reddedilen:{' '}
            <span className={`font-medium ${(owner?.rejectedNeeds ?? 0) > 0 ? 'text-error' : 'text-text'}`}>
              {owner?.rejectedNeeds ?? 0}
            </span>
          </span>
        </div>
      </div>
    </Card>
  );
};

// ---------- page ----------

const ReviewQueuePage: React.FC = () => {
  const { refreshStats, bumpStat, showToast } = useAdmin();
  const [items, setItems] = useState<AdminNeedItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminAPI.getNeeds({ status: 'PendingReview', page: 1, pageSize: 100 });
      const sorted = sortQueue(result.items);
      setItems(sorted);
      setSelectedId((current) =>
        current && sorted.some((n) => n.id === current) ? current : sorted[0]?.id ?? null,
      );
    } catch {
      setError('Onay kuyruğu yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedIndex = useMemo(() => {
    const index = items.findIndex((n) => n.id === selectedId);
    return index >= 0 ? index : items.length > 0 ? 0 : -1;
  }, [items, selectedId]);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;

  const images = useMemo(() => (selected ? selected.images.map((i) => resolveMediaUrl(i.imageUrl)) : []), [selected]);

  const move = useCallback(
    (delta: number) => {
      if (items.length === 0) return;
      const next = Math.min(items.length - 1, Math.max(0, selectedIndex + delta));
      setSelectedId(items[next].id);
      document.getElementById(`queue-item-${items[next].id}`)?.scrollIntoView({ block: 'nearest' });
    },
    [items, selectedIndex],
  );

  /** Optimistically removes the need, advances to the next one, and rolls back on failure */
  const runAction = useCallback(
    async (item: AdminNeedItem, action: () => Promise<void>, kind: 'approve' | 'reject') => {
      const index = items.findIndex((n) => n.id === item.id);
      if (index < 0) return;
      const remaining = items.filter((n) => n.id !== item.id);
      setItems(remaining);
      setSelectedId(remaining[Math.min(index, remaining.length - 1)]?.id ?? null);
      bumpStat('pendingNeeds', -1);
      bumpStat(kind === 'approve' ? 'approvedToday' : 'rejectedToday', 1);
      try {
        await action();
        showToast(kind === 'approve' ? `"${item.title}" onaylandı ve yayınlandı.` : `"${item.title}" reddedildi.`);
      } catch (err) {
        setItems((current) => {
          if (current.some((n) => n.id === item.id)) return current;
          const next = [...current];
          next.splice(Math.min(index, next.length), 0, item);
          return next;
        });
        setSelectedId(item.id);
        showToast(
          getApiErrorMessage(err) ||
            (kind === 'approve' ? 'İlan onaylanamadı. Tekrar deneyin.' : 'İlan reddedilemedi. Tekrar deneyin.'),
          'error',
        );
      } finally {
        refreshStats();
      }
    },
    [items, bumpStat, refreshStats, showToast],
  );

  const approve = useCallback(() => {
    if (!selected) return;
    void runAction(selected, () => adminAPI.approveNeed(selected.id), 'approve');
  }, [selected, runAction]);

  const confirmReject = async (reason: ModerationReason, note: string) => {
    if (!selected) return;
    const target = selected;
    setRejecting(false);
    await runAction(target, () => adminAPI.rejectNeed(target.id, reason, note || undefined), 'reject');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      if (rejecting || lightboxIndex !== null || document.querySelector('[data-modal-open="true"]')) return;
      const key = e.key.toLocaleLowerCase('tr-TR');
      if (key === 'a') {
        e.preventDefault();
        approve();
      } else if (key === 'r') {
        if (!selected) return;
        e.preventDefault();
        setRejecting(true);
      } else if (key === 'j') {
        e.preventDefault();
        move(1);
      } else if (key === 'k') {
        e.preventDefault();
        move(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [approve, move, rejecting, lightboxIndex, selected]);

  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Loading text="Onay kuyruğu yükleniyor..." />
      </div>
    );
  }

  if (error) return <LoadError message={error} onRetry={load} />;

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Onay Kuyruğu</h1>
          <p className="text-sm text-text-secondary">
            İşaretlenen ilanlar önce, ardından en eski ilan başta listelenir.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={load} leftIcon={<ArrowPathIcon className="h-4 w-4" />}>
          Yenile
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="text-center py-16">
          <ClipboardDocumentCheckIcon className="h-12 w-12 text-text-secondary mx-auto mb-3" />
          <p className="font-semibold text-text">Onay bekleyen ilan yok.</p>
          <p className="text-sm text-text-secondary mt-1">Yeni ilanlar geldiğinde burada görünür.</p>
        </Card>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(240px,320px)_1fr] gap-4">
          {/* Queue list */}
          <Card padding="none" className="overflow-hidden flex flex-col md:max-h-[calc(100vh-15rem)]">
            <div className="px-4 py-2.5 border-b border-border text-sm text-text-secondary">
              {items.length} ilan bekliyor
            </div>
            <ul className="overflow-y-auto divide-y divide-border max-h-72 md:max-h-none" role="listbox" aria-label="Onay bekleyen ilanlar">
              {items.map((item) => {
                const active = item.id === selected?.id;
                return (
                  <li key={item.id} id={`queue-item-${item.id}`} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full text-left px-4 py-3 border-l-4 transition-colors ${
                        active ? 'bg-primary-light border-primary' : 'border-transparent hover:bg-background'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <p className="flex-1 min-w-0 font-medium text-text text-sm line-clamp-2">{item.title}</p>
                        {item.flaggedTerms.length > 0 && (
                          <ExclamationTriangleIcon
                            className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5"
                            aria-label="İşaretlendi"
                          />
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-1 truncate">
                        {item.user?.fullName} · {formatRelative(item.createdAt)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Detail */}
          <div className="min-h-0 md:max-h-[calc(100vh-15rem)]">
            {selected && (
              <NeedReviewDetail
                key={selected.id}
                item={selected}
                onApprove={approve}
                onReject={() => setRejecting(true)}
                onOpenImage={setLightboxIndex}
              />
            )}
          </div>
        </div>
      )}

      <ReasonDialog
        isOpen={rejecting}
        title="İlanı Reddet"
        description={selected ? `"${selected.title}" yayınlanmayacak. Neden ilan sahibine gösterilir.` : undefined}
        confirmLabel="Reddet"
        onClose={() => setRejecting(false)}
        onConfirm={confirmReject}
      />

      {lightboxIndex !== null && images.length > 0 && (
        <Lightbox
          images={images}
          index={Math.min(lightboxIndex, images.length - 1)}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
};

export default ReviewQueuePage;
