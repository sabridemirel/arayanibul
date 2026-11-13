const parseDate = (value?: string) => {
  if (!value) return new Date(NaN);
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
};

export const formatDateTime = (value?: string) => {
  const d = parseDate(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (value?: string) => {
  const d = parseDate(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const formatRelative = (value?: string) => {
  const d = parseDate(value);
  if (isNaN(d.getTime())) return '';
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Az önce';
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} saat önce`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD} gün önce`;
  return formatDate(value);
};

export const formatBudget = (min?: number, max?: number, currency = 'TRY') => {
  const cur = currency === 'TRY' ? 'TL' : currency;
  const f = (n: number) => n.toLocaleString('tr-TR');
  if (min && max) return `${f(min)} - ${f(max)} ${cur}`;
  if (max) return `${f(max)} ${cur}'ye kadar`;
  if (min) return `${f(min)} ${cur} ve üzeri`;
  return 'Belirtilmemiş';
};

export const URGENCY_LABELS: Record<string, string> = {
  Flexible: 'Esnek',
  Normal: 'Normal',
  Urgent: 'Acil',
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Splits text into [plain, match, plain, ...] parts for the given terms (case-insensitive) */
export const splitByTerms = (text: string, terms: string[]): { text: string; match: boolean }[] => {
  const cleaned = terms.map((t) => t.trim()).filter(Boolean);
  if (!text || cleaned.length === 0) return [{ text, match: false }];
  // Longest first so overlapping terms prefer the fuller match
  const pattern = cleaned.sort((a, b) => b.length - a.length).map(escapeRegExp).join('|');
  const regex = new RegExp(`(${pattern})`, 'giu');
  // split() with a capturing group puts the matches at odd indexes
  return text
    .split(regex)
    .map((part, index) => ({ text: part, match: index % 2 === 1 }))
    .filter((part) => part.text !== '');
};
