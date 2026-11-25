import type { NeedDraftQuestion } from '../services/api';

/**
 * A listing someone wrote before signing in. It is kept for the browser tab only, so the visitor
 * can register or log in and come back to publish it without retyping.
 */
export interface PendingNeedDraft {
  text: string;
  title: string;
  description: string;
  categoryId: number | null;
  minBudget: string;
  maxBudget: string;
  address: string;
  /** Answers to the category's one-tap questions, keyed by question label */
  answers: Record<string, string>;
  /** The one-tap questions that were offered, so they can be shown again after signing in */
  questions?: NeedDraftQuestion[];
}

const STORAGE_KEY = 'arayanibul.pendingNeedDraft';

export const savePendingNeedDraft = (draft: PendingNeedDraft): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage can be unavailable (private mode); the visitor then simply retypes the listing.
  }
};

export const loadPendingNeedDraft = (): PendingNeedDraft | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingNeedDraft) : null;
  } catch {
    return null;
  }
};

export const clearPendingNeedDraft = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear
  }
};

const RETURN_TO_KEY = 'arayanibul.returnTo';

/** Remembers the page (within this site) a visitor should come back to after signing in. */
export const rememberReturnTo = (path: string): void => {
  try {
    if (path.startsWith('/') && !path.startsWith('//')) sessionStorage.setItem(RETURN_TO_KEY, path);
  } catch {
    // Without storage the visitor lands on the home page after signing in.
  }
};

const peekReturnTo = (): string | null => {
  try {
    const path = sessionStorage.getItem(RETURN_TO_KEY);
    return path && path.startsWith('/') && !path.startsWith('//') ? path : null;
  } catch {
    return null;
  }
};

/** Called by the page the visitor came back to. Signing in reads the value more than once (the
 * sign-in page and the route guard both redirect), so reading must not clear it. */
export const clearReturnTo = (): void => {
  try {
    sessionStorage.removeItem(RETURN_TO_KEY);
  } catch {
    // Nothing to clear
  }
};

/**
 * Where to send someone after they sign in: back to their unfinished listing if there is one,
 * otherwise to the page they were on when they were asked to sign in.
 */
export const postAuthPath = (): string => (loadPendingNeedDraft() ? '/create-need' : (peekReturnTo() ?? '/'));
