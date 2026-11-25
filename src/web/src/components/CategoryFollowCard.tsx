import React, { useEffect, useMemo, useState } from 'react';
import { BellAlertIcon } from '@heroicons/react/24/outline';
import { categoryAPI } from '../services/api';
import type { Category } from '../services/api';
import { useCategories } from '../utils/categoryVisual';
import { Button, Card, ErrorMessage, Loading } from './ui';

const PRIMARY_ROOT_COUNT = 3;

interface CategoryFollowCardProps {
  className?: string;
}

/**
 * Lets a seller pick the categories they want to hear about: every new listing in a followed
 * category creates a notification and, if enabled, an e-mail. Following a main category covers
 * all of its subcategories.
 */
const CategoryFollowCard: React.FC<CategoryFollowCardProps> = ({ className = '' }) => {
  const categories = useCategories();
  const [followed, setFollowed] = useState<Set<number>>(new Set());
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const roots = useMemo(
    () => categories.filter((category) => !category.parentCategoryId).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  useEffect(() => {
    let cancelled = false;
    categoryAPI
      .getFollows()
      .then((result) => {
        if (cancelled) return;
        setFollowed(new Set(result.categoryIds));
        setEmailEnabled(result.emailEnabled);
      })
      .catch(() => {
        if (!cancelled) setError('Takip ettiğiniz kategoriler yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (categoryId: number) => {
    setFollowed((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
    setIsDirty(true);
    setSavedMessage(null);
  };

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await categoryAPI.setFollows([...followed], emailEnabled);
      setFollowed(new Set(result.categoryIds));
      setEmailEnabled(result.emailEnabled);
      setIsDirty(false);
      setSavedMessage(
        result.categoryIds.length > 0
          ? 'Tercihleriniz kaydedildi. Yeni ilanlarda size haber vereceğiz.'
          : 'Tercihleriniz kaydedildi. Artık yeni ilan bildirimi almayacaksınız.'
      );
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Tercihleriniz kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderRoot = (root: Category) => {
    const rootFollowed = followed.has(root.id);
    const subCategories = [...(root.subCategories ?? [])].sort((x, y) => x.sortOrder - y.sortOrder);
    return (
      <fieldset key={root.id}>
        <legend className="mb-2 text-sm font-semibold text-text">{root.nameTr || root.name}</legend>
        <div className="flex flex-wrap gap-2">
          <FollowChip
            label={`Tüm ${root.nameTr || root.name}`}
            selected={rootFollowed}
            onToggle={() => toggle(root.id)}
          />
          {subCategories.map((sub) => (
            <FollowChip
              key={sub.id}
              label={sub.nameTr || sub.name}
              // The whole category already covers each of its subcategories
              selected={rootFollowed || followed.has(sub.id)}
              disabled={rootFollowed}
              onToggle={() => toggle(sub.id)}
            />
          ))}
        </div>
      </fieldset>
    );
  };

  // The launch focus categories stay in view; the rest open on demand so the card stays short.
  const primaryRoots = roots.slice(0, PRIMARY_ROOT_COUNT);
  const otherRoots = roots.slice(PRIMARY_ROOT_COUNT);
  const followsOther = otherRoots.some(
    (root) => followed.has(root.id) || (root.subCategories ?? []).some((sub) => followed.has(sub.id))
  );

  return (
    <Card padding="lg" className={className}>
      <div className="flex items-start gap-2">
        <BellAlertIcon className="mt-0.5 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-text">Yeni ilan bildirimleri</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Satış yaptığınız kategorileri seçin; o kategoride yeni bir ilan yayınlandığında size haber
            verelim. Teklif vermek ücretsizdir.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loading size="md" text="Kategoriler yükleniyor..." />
        </div>
      ) : (
        <>
          <div className="mt-5 space-y-5">
            {primaryRoots.map(renderRoot)}
            {otherRoots.length > 0 && (
              <details open={followsOther || undefined} className="group">
                <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  Diğer kategoriler ({otherRoots.length})
                </summary>
                <div className="mt-3 space-y-5">{otherRoots.map(renderRoot)}</div>
              </details>
            )}
          </div>

          <label className="mt-6 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-text">
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(event) => {
                setEmailEnabled(event.target.checked);
                setIsDirty(true);
                setSavedMessage(null);
              }}
              className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
            />
            Yeni ilanları e-postayla da bildir (günde en fazla 5 e-posta)
          </label>

          {error && <ErrorMessage message={error} className="mt-4" />}
          {savedMessage && (
            <p role="status" className="mt-4 text-sm font-medium text-green-800">
              {savedMessage}
            </p>
          )}

          <Button className="mt-5" onClick={save} isLoading={isSaving} disabled={!isDirty || isSaving}>
            Tercihleri Kaydet
          </Button>
        </>
      )}
    </Card>
  );
};

interface FollowChipProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

const FollowChip: React.FC<FollowChipProps> = ({ label, selected, disabled = false, onToggle }) => (
  <button
    type="button"
    aria-pressed={selected}
    disabled={disabled}
    onClick={onToggle}
    className={`min-h-11 rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
      selected ? 'border-primary bg-primary text-white' : 'border-border text-text hover:border-primary'
    } ${disabled ? 'cursor-default opacity-60' : ''}`}
  >
    {label}
  </button>
);

export default CategoryFollowCard;
