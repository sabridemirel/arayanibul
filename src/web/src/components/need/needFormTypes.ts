import type { NeedDraftQuestion, NeedImage } from '../../services/api';

/** Listings are either normal or "Acil" (7 days at the top of the list). */
export type NeedUrgency = 'Normal' | 'Urgent';

/** What the listing form edits. The same form serves quick listing, detailed listing and editing. */
export interface NeedFormValues {
  title: string;
  /** Free text; filled from the sentence in quick listing, optional to edit ("Ayrıntılar") */
  description: string;
  categoryId: number | null;
  /** true = "Bu fiyata hemen alırım" with one price; false = "Tekliflere açığım", no price */
  isFixedPrice: boolean;
  /** Raw digits of the fixed price, e.g. "15000" */
  price: string;
  urgency: NeedUrgency;
  address: string;
  /** yyyy-mm-dd, optional */
  expiryDate: string;
  /** Answers to the category's one-tap questions ("Durum" → "İkinci el"), added to the description */
  answers: Record<string, string>;
}

/** A catalogued product recognised in the sentence, with what buyers offer for it right now. */
export interface ProductHint {
  slug: string;
  name: string;
  realPrice?: number | null;
}

export interface NeedFormSubmitData {
  values: NeedFormValues;
  /** Newly picked files, to upload */
  newImages: File[];
  /** Existing images the user kept, in display order */
  keptImages: NeedImage[];
  /** Existing images the user removed */
  removedImageIds: number[];
}

/** Context the quick-listing sentence gives the form beyond its values. */
export interface NeedFormExtras {
  questions: NeedDraftQuestion[];
  product: ProductHint | null;
}

export const URGENCY_TO_API: Record<NeedUrgency, number> = {
  Normal: 2,
  Urgent: 3,
};

export const emptyNeedFormValues = (): NeedFormValues => ({
  title: '',
  description: '',
  categoryId: null,
  isFixedPrice: false,
  price: '',
  urgency: 'Normal',
  address: '',
  expiryDate: '',
  answers: {},
});

/** Description sent to the API: the text plus the one-tap answers, one per line ("Durum: İkinci el"). */
export const composeDescription = (values: NeedFormValues): string => {
  const lines = [
    values.description.trim(),
    ...Object.entries(values.answers).map(([label, answer]) => `${label}: ${answer}`),
  ].filter(Boolean);
  const text = lines.join('\n');
  // The API wants at least 10 characters; a bare title is turned into a sentence.
  return text.length >= 10 ? text : `${values.title.trim()} arıyorum.${text ? `\n${text}` : ''}`;
};
