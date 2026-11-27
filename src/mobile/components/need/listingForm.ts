import type { NeedDraftQuestion } from '../../services/api';

/** Listings are either normal or "Acil" (7 days at the top of the list). */
export type ListingUrgency = 'Normal' | 'Urgent';

/** What the listing form edits; quick listing, detailed listing and editing share it. */
export interface ListingFormValues {
  title: string;
  description: string;
  categoryId: number | null;
  /** true = "Bu fiyata hemen alırım" with one price; false = "Tekliflere açığım", no price */
  isFixedPrice: boolean;
  /** Raw digits of the fixed price */
  price: string;
  urgency: ListingUrgency;
  address: string;
  /** One-tap answers ("Durum" → "İkinci el"), added to the description */
  answers: Record<string, string>;
}

/** A catalogued product recognised in the sentence, with what buyers offer for it right now. */
export interface ProductHint {
  slug: string;
  name: string;
  realPrice?: number | null;
}

export const URGENCY_TO_API: Record<ListingUrgency, number> = { Normal: 2, Urgent: 3 };

export const emptyListingValues = (): ListingFormValues => ({
  title: '',
  description: '',
  categoryId: null,
  isFixedPrice: false,
  price: '',
  urgency: 'Normal',
  address: '',
  answers: {},
});

/** Description sent to the API: the text plus the one-tap answers, one per line. */
export const composeDescription = (values: ListingFormValues): string => {
  const lines = [
    values.description.trim(),
    ...Object.entries(values.answers).map(([label, answer]) => `${label}: ${answer}`),
  ].filter(Boolean);
  const text = lines.join('\n');
  // The API wants at least 10 characters; a bare title is turned into a sentence.
  return text.length >= 10 ? text : `${values.title.trim()} arıyorum.${text ? `\n${text}` : ''}`;
};

export type { NeedDraftQuestion };
