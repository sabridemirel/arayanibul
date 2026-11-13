import type { NeedImage } from '../../services/api';

export type NeedUrgency = 'Flexible' | 'Normal' | 'Urgent';

export interface NeedFormValues {
  title: string;
  description: string;
  categoryId: number | null;
  /** Raw digits, e.g. "15000" */
  minBudget: string;
  maxBudget: string;
  address: string;
  urgency: NeedUrgency;
  /** yyyy-mm-dd */
  expiryDate: string;
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

export const URGENCY_TO_API: Record<NeedUrgency, number> = {
  Flexible: 1,
  Normal: 2,
  Urgent: 3,
};
