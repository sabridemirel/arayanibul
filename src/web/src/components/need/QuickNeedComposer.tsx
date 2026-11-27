import React, { useState } from 'react';
import { needAPI } from '../../services/api';
import { Button } from '../ui';
import { emptyNeedFormValues } from './needFormTypes';
import type { NeedFormExtras, NeedFormValues } from './needFormTypes';

const EXAMPLES = [
  'İkinci el RTX 3080, 15 bin TL, İstanbul',
  'Cybex oto koltuğu, temiz kullanılmış, Ankara',
  '4 kişilik kamp çadırı, Bursa',
];

const MIN_TEXT_LENGTH = 3;

interface QuickNeedComposerProps {
  initialText?: string;
  /** The sentence was understood: open the listing form filled with it */
  onReady: (values: NeedFormValues, extras: NeedFormExtras) => void;
  /** Open the empty listing form with "Ayrıntılar" shown */
  onUseDetailedForm: () => void;
}

/**
 * Quick listing, step one: one sentence. The server suggests title, category, price and location;
 * the same listing form as the detailed path opens with them filled in.
 */
const QuickNeedComposer: React.FC<QuickNeedComposerProps> = ({ initialText = '', onReady, onUseDetailedForm }) => {
  const [text, setText] = useState(initialText);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // A price in the sentence ("15 bin TL") reads as "bu fiyata hemen alırım"; the buyer can
      // switch to offers in the form. Without one the listing is open to offers.
      const price = suggestion.maxBudget ?? suggestion.minBudget ?? null;
      const questions = suggestion.questions ?? [];
      onReady(
        {
          ...emptyNeedFormValues(),
          title: suggestion.title,
          description: suggestion.description,
          categoryId: suggestion.categoryId ?? null,
          isFixedPrice: price != null,
          price: price != null ? String(Math.round(price)) : '',
          address: suggestion.address ?? '',
          answers: Object.fromEntries(
            questions.filter((q) => q.selected).map((q) => [q.label, q.selected as string])
          ),
        },
        {
          questions,
          product: suggestion.productSlug
            ? {
                slug: suggestion.productSlug,
                name: suggestion.productName ?? suggestion.title,
                realPrice: suggestion.productRealPrice ?? null,
              }
            : null,
        }
      );
    } catch {
      setError('Yazdıklarınız işlenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIsReading(false);
    }
  };

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
        Tek cümle yeter. Fiyatınızı ve şehrinizi de yazarsanız ilanınız kendiliğinden dolar.
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
          onClick={onUseDetailedForm}
          className="min-h-11 self-start text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:self-auto"
        >
          Ayrıntılı formu kullan
        </button>
      </div>
    </form>
  );
};

export default QuickNeedComposer;
