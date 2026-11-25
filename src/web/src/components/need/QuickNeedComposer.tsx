import React, { useMemo, useState } from 'react';
import { MapPinIcon, PencilSquareIcon, SparklesIcon, TagIcon } from '@heroicons/react/24/outline';
import { needAPI } from '../../services/api';
import type { Category } from '../../services/api';
import { getCategoryVisual, useCategories } from '../../utils/categoryVisual';
import type { PendingNeedDraft } from '../../utils/pendingNeedDraft';
import { Button, Input } from '../ui';

const EXAMPLES = [
  'İkinci el RTX 3080, 15 bin TL’ye kadar, İstanbul',
  'Cybex oto koltuğu, temiz kullanılmış, Ankara',
  '4 kişilik kamp çadırı, 5.000 TL’ye kadar',
];

const MIN_TEXT_LENGTH = 3;

const formatAmount = (digits: string) => Number(digits).toLocaleString('tr-TR');

const budgetText = (draft: PendingNeedDraft): string => {
  if (draft.minBudget && draft.maxBudget) {
    return `${formatAmount(draft.minBudget)} – ${formatAmount(draft.maxBudget)} TL`;
  }
  if (draft.maxBudget) return `En fazla ${formatAmount(draft.maxBudget)} TL`;
  if (draft.minBudget) return `En az ${formatAmount(draft.minBudget)} TL`;
  return 'Bütçe belirtilmemiş';
};

/** The listing as buyers and sellers will see it in the list; updates while the fields change. */
const NeedPreview: React.FC<{ draft: PendingNeedDraft; categories: Category[] }> = ({ draft, categories }) => {
  const all = categories.flatMap((category) => [category, ...(category.subCategories ?? [])]);
  const category = all.find((item) => item.id === draft.categoryId);
  const visual = getCategoryVisual(draft.categoryId ?? undefined, categories);
  const answers = Object.values(draft.answers);

  return (
    <div className="mt-5">
      <p className="mb-1.5 text-xs font-semibold text-text-secondary">İlanınız listede böyle görünecek</p>
      <div className="flex gap-3.5 rounded-xl border border-border bg-background p-3">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: visual.background }}
        >
          <visual.Icon className="h-9 w-9" style={{ color: visual.foreground }} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold" style={{ color: visual.foreground }}>
            {category ? category.nameTr || category.name : 'Kategori seçilmedi'}
          </p>
          <p className="line-clamp-2 font-semibold leading-snug text-text">{draft.title || 'Başlık'}</p>
          <p className="mt-1 font-bold text-primary">{budgetText(draft)}</p>
          <p className="truncate text-xs text-text-secondary">
            {[draft.address.trim(), ...answers].filter(Boolean).join(' · ') || 'Konum belirtilmemiş'}
          </p>
        </div>
      </div>
    </div>
  );
};

interface QuickNeedComposerProps {
  /** Text or a full draft to start from (search query, or a listing written before signing in) */
  initialText?: string;
  initialDraft?: PendingNeedDraft | null;
  isSubmitting: boolean;
  onPublish: (draft: PendingNeedDraft) => void;
  /** Switch to the long form, carrying over what has been filled in so far */
  onUseDetailedForm: (draft: PendingNeedDraft | null) => void;
}

const digitsOnly = (value: string) => value.replace(/\D/g, '');

/**
 * Posting a listing in two short steps: write one sentence, then confirm what was understood from
 * it (category, budget, location) and publish.
 */
const QuickNeedComposer: React.FC<QuickNeedComposerProps> = ({
  initialText = '',
  initialDraft = null,
  isSubmitting,
  onPublish,
  onUseDetailedForm,
}) => {
  const categories = useCategories();
  const [text, setText] = useState(initialDraft?.text ?? initialText);
  const [draft, setDraft] = useState<PendingNeedDraft | null>(initialDraft);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootCategories = useMemo(
    () => categories.filter((category: Category) => !category.parentCategoryId),
    [categories]
  );

  const readText = async () => {
    const trimmed = text.trim();
    if (trimmed.length < MIN_TEXT_LENGTH) {
      setError('Ne aradığınızı birkaç kelimeyle yazın.');
      return;
    }

    setError(null);
    setIsReading(true);
    try {
      const suggestion = await needAPI.buildDraft(trimmed);
      setShowMinBudget(Boolean(suggestion.minBudget));
      setDraft({
        text: trimmed,
        title: suggestion.title,
        description: suggestion.description,
        categoryId: suggestion.categoryId ?? null,
        minBudget: suggestion.minBudget ? String(suggestion.minBudget) : '',
        maxBudget: suggestion.maxBudget ? String(suggestion.maxBudget) : '',
        address: suggestion.address ?? '',
        questions: suggestion.questions ?? [],
        answers: Object.fromEntries(
          (suggestion.questions ?? [])
            .filter((question) => question.selected)
            .map((question) => [question.label, question.selected as string])
        ),
      });
    } catch {
      setError('Yazdıklarınız işlenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIsReading(false);
    }
  };

  // The lower bound is rare; it only gets a field when the text contained one ("20-30 bin").
  const [showMinBudget, setShowMinBudget] = useState(Boolean(initialDraft?.minBudget));

  const update = (changes: Partial<PendingNeedDraft>) =>
    setDraft((current) => (current ? { ...current, ...changes } : current));

  const publish = () => {
    if (!draft) return;
    if (draft.title.trim().length < 5) {
      setError('Başlık en az 5 karakter olmalı.');
      return;
    }
    if (!draft.categoryId) {
      setError('İlanınız için bir kategori seçin.');
      return;
    }
    if (draft.minBudget && draft.maxBudget && Number(draft.minBudget) > Number(draft.maxBudget)) {
      setError('En az bütçe, en fazla bütçeden büyük olamaz.');
      return;
    }
    setError(null);
    onPublish(draft);
  };

  // ---- Step 1: one sentence
  if (!draft) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void readText();
        }}
        className="rounded-xl border border-border bg-surface p-5 sm:p-6"
      >
        <label htmlFor="quick-need-text" className="block text-lg font-bold text-text">
          Ne arıyorsunuz?
        </label>
        <p className="mt-1 text-sm text-text-secondary">
          Tek cümle yeter. Bütçenizi ve şehrinizi de yazarsanız ilanınız kendiliğinden dolar.
        </p>
        <textarea
          id="quick-need-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          maxLength={2000}
          autoFocus
          placeholder={EXAMPLES[0]}
          className="mt-3 w-full rounded-lg border border-border bg-background px-4 py-3 text-text placeholder:text-text-secondary/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        <div className="mt-3">
          <p className="text-xs font-semibold text-text-secondary">Örnekler</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setText(example)}
                className="min-h-10 rounded-full border border-border px-3.5 text-left text-sm text-text-secondary hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" size="lg" isLoading={isReading}>
            Devam Et
          </Button>
          <button
            type="button"
            onClick={() => onUseDetailedForm(null)}
            className="min-h-11 self-start text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:self-auto"
          >
            Ayrıntılı formu kullan
          </button>
        </div>
      </form>
    );
  }

  // ---- Step 2: confirm what was understood
  return (
    <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-2">
        <SparklesIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-bold text-text">İlanınız hazır</h2>
          <p className="text-sm text-text-secondary">
            Yazdıklarınızdan çıkardıklarımızı kontrol edin; yanlış olanı düzeltip yayınlayın.
          </p>
        </div>
      </div>

      <NeedPreview draft={draft} categories={categories} />

      <div className="mt-5 space-y-4">
        <Input
          id="quick-need-title"
          label="Başlık"
          value={draft.title}
          onChange={(event) => update({ title: event.target.value })}
          maxLength={200}
          fullWidth
        />

        <div>
          <label htmlFor="quick-need-category" className="mb-1 block text-sm font-medium text-text">
            <TagIcon className="mr-1 inline h-4 w-4 align-text-bottom" aria-hidden="true" />
            Kategori
          </label>
          <select
            // Remount when the category list arrives: a select does not pick up its value for
            // options that are added after it was first rendered.
            key={rootCategories.length}
            id="quick-need-category"
            value={draft.categoryId ?? ''}
            onChange={(event) =>
              update({ categoryId: event.target.value ? Number(event.target.value) : null })
            }
            className={`w-full rounded-lg border bg-background px-3 py-2.5 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ${
              draft.categoryId ? 'border-border' : 'border-secondary-orange'
            }`}
          >
            <option value="">Kategori seçin</option>
            {rootCategories.map((root) => (
              <optgroup key={root.id} label={root.nameTr || root.name}>
                {(root.subCategories ?? []).length === 0 && (
                  <option value={root.id}>{root.nameTr || root.name}</option>
                )}
                {[...(root.subCategories ?? [])]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.nameTr || sub.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {!draft.categoryId && (
            <p className="mt-1 text-sm text-text-secondary">
              Kategoriyi yazdıklarınızdan çıkaramadık; listeden seçin.
            </p>
          )}
        </div>

        <div className={`grid gap-4 ${showMinBudget ? 'sm:grid-cols-2' : ''}`}>
          {showMinBudget && (
            <Input
              id="quick-need-min-budget"
              label="En az bütçe (TL)"
              inputMode="numeric"
              placeholder="İsteğe bağlı"
              value={draft.minBudget}
              onChange={(event) => update({ minBudget: digitsOnly(event.target.value) })}
              fullWidth
            />
          )}
          <Input
            id="quick-need-max-budget"
            label="En fazla bütçe (TL)"
            inputMode="numeric"
            placeholder="İsteğe bağlı"
            value={draft.maxBudget}
            onChange={(event) => update({ maxBudget: digitsOnly(event.target.value) })}
            fullWidth
          />
        </div>

        <Input
          id="quick-need-address"
          label="Konum"
          placeholder="Şehir veya ilçe (isteğe bağlı)"
          value={draft.address}
          onChange={(event) => update({ address: event.target.value })}
          leftIcon={<MapPinIcon className="h-5 w-5" aria-hidden="true" />}
          maxLength={500}
          fullWidth
        />

        {(draft.questions ?? []).map((question) => (
          <fieldset key={question.label}>
            <legend className="mb-1.5 text-sm font-medium text-text">{question.label}</legend>
            <div className="flex flex-wrap gap-2">
              {question.options.map((option) => {
                const isSelected = draft.answers[question.label] === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      const answers = { ...draft.answers };
                      if (isSelected) delete answers[question.label];
                      else answers[question.label] = option;
                      update({ answers });
                    }}
                    className={`min-h-11 rounded-full border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      isSelected
                        ? 'border-primary bg-primary text-white'
                        : 'border-border text-text hover:border-primary'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button size="lg" onClick={publish} isLoading={isSubmitting}>
          İlanı Yayınla
        </Button>
        <Button variant="outline" size="lg" onClick={() => onUseDetailedForm(draft)} disabled={isSubmitting}>
          Fotoğraf veya Detay Ekle
        </Button>
        <button
          type="button"
          onClick={() => {
            setDraft(null);
            setError(null);
          }}
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:ml-auto sm:self-auto"
        >
          <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
          Baştan Yaz
        </button>
      </div>
    </div>
  );
};

export default QuickNeedComposer;
