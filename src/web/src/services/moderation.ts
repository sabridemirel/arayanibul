import { api } from './api';
import type { Need } from './api';

// ---------- labels ----------

export const NEED_STATUS_LABELS: Record<string, string> = {
  PendingReview: 'İncelemede',
  Active: 'Aktif',
  InProgress: 'Devam Ediyor',
  Completed: 'Tamamlandı',
  Cancelled: 'İptal Edildi',
  Expired: 'Süresi Doldu',
  Rejected: 'Yayınlanmadı',
};

export type BadgeTone = 'success' | 'warning' | 'primary' | 'error' | 'default' | 'info' | 'secondary';

export const NEED_STATUS_TONES: Record<string, BadgeTone> = {
  PendingReview: 'info',
  Active: 'success',
  InProgress: 'warning',
  Completed: 'primary',
  Cancelled: 'error',
  Expired: 'error',
  Rejected: 'error',
};

export type ModerationReason =
  | 'ProhibitedItem'
  | 'Misleading'
  | 'InappropriateLanguage'
  | 'ContactInfo'
  | 'Duplicate'
  | 'Other';

export const MODERATION_REASONS: { value: ModerationReason; label: string }[] = [
  { value: 'ProhibitedItem', label: 'Yasaklı ürün veya hizmet' },
  { value: 'Misleading', label: 'Yanıltıcı veya eksik içerik' },
  { value: 'InappropriateLanguage', label: 'Uygunsuz dil' },
  { value: 'ContactInfo', label: 'İlanda iletişim bilgisi paylaşımı' },
  { value: 'Duplicate', label: 'Tekrarlanan ilan' },
  { value: 'Other', label: 'Diğer' },
];

export type ReportReason = 'Spam' | 'Inappropriate' | 'Fraud' | 'Harassment' | 'Other';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'Spam', label: 'Spam veya reklam' },
  { value: 'Inappropriate', label: 'Uygunsuz içerik' },
  { value: 'Fraud', label: 'Dolandırıcılık şüphesi' },
  { value: 'Harassment', label: 'Taciz veya hakaret' },
  { value: 'Other', label: 'Diğer' },
];

export type ReportTargetType = 'Need' | 'Message' | 'User';

// ---------- user-facing ----------

export interface BlockedUser {
  userId: string;
  fullName: string;
  blockedAt: string;
}

export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: string | number;
  reason: ReportReason;
  note?: string;
}

export const reportAPI = {
  create: (data: CreateReportRequest): Promise<{ message: string }> =>
    api.post('/reports', data).then((res) => res.data),
};

export const blockAPI = {
  block: (userId: string): Promise<{ message: string }> =>
    api.post(`/users/${userId}/block`).then((res) => res.data),

  unblock: (userId: string): Promise<{ message: string }> =>
    api.delete(`/users/${userId}/block`).then((res) => res.data),

  list: (): Promise<BlockedUser[]> =>
    api.get('/users/blocked').then((res) => (Array.isArray(res.data) ? res.data : res.data?.items ?? [])),
};

// ---------- admin ----------

export interface Paged<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AdminStats {
  pendingNeeds: number;
  openReports: number;
  suspendedUsers: number;
  approvedToday: number;
  rejectedToday: number;
}

export interface AdminNeedOwner {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
  totalNeeds: number;
  rejectedNeeds: number;
  isSuspended: boolean;
}

export interface AdminNeedItem {
  id: number;
  title: string;
  description: string;
  categoryName?: string;
  minBudget?: number;
  maxBudget?: number;
  currency?: string;
  address?: string;
  urgency?: string;
  status: Need['status'];
  createdAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  rejectionReasonText?: string;
  rejectionNote?: string;
  flaggedTerms: string[];
  images: { id: number; imageUrl: string }[];
  user: AdminNeedOwner;
}

export type ReportStatus = 'Open' | 'Resolved' | 'Dismissed';
export type ReportAction = 'Dismiss' | 'TakeDownNeed' | 'SuspendUser';

export interface AdminReport {
  id: number;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  reasonText?: string;
  note?: string;
  status: ReportStatus;
  createdAt: string;
  reporter: { id: string; fullName: string };
  target: {
    title?: string;
    content?: string;
    userId?: string;
    userName?: string;
    needId?: number;
    offerId?: number;
  };
  resolvedAt?: string;
  resolutionNote?: string;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
  isSuspended: boolean;
  suspendedReason?: string;
  totalNeeds: number;
  rejectedNeeds: number;
  reportCount: number;
  roles: string[];
}

export interface AdminNeedFilters {
  status?: string;
  search?: string;
  flaggedOnly?: boolean;
  page?: number;
  pageSize?: number;
}

const clean = (params: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== false) out[k] = v;
  });
  return out;
};

const toPaged = <T>(data: unknown): Paged<T> => {
  if (Array.isArray(data)) return { items: data as T[], totalCount: data.length, page: 1, pageSize: data.length };
  const d = (data ?? {}) as Partial<Paged<T>>;
  return {
    items: Array.isArray(d.items) ? d.items : [],
    totalCount: d.totalCount ?? 0,
    page: d.page ?? 1,
    pageSize: d.pageSize ?? 20,
  };
};

const toAdminNeed = (n: AdminNeedItem): AdminNeedItem => ({
  ...n,
  flaggedTerms: Array.isArray(n.flaggedTerms) ? n.flaggedTerms : [],
  images: Array.isArray(n.images) ? n.images : [],
});

export const adminAPI = {
  getStats: (): Promise<AdminStats> => api.get('/admin/stats').then((res) => res.data),

  getNeeds: (filters: AdminNeedFilters = {}): Promise<Paged<AdminNeedItem>> =>
    api.get('/admin/needs', { params: clean({ ...filters }) }).then((res) => {
      const paged = toPaged<AdminNeedItem>(res.data);
      return { ...paged, items: paged.items.map(toAdminNeed) };
    }),

  approveNeed: (id: number): Promise<void> => api.post(`/admin/needs/${id}/approve`).then(() => undefined),

  rejectNeed: (id: number, reason: ModerationReason, note?: string): Promise<void> =>
    api.post(`/admin/needs/${id}/reject`, { reason, note: note || undefined }).then(() => undefined),

  takeDownNeed: (id: number, reason: ModerationReason, note?: string): Promise<void> =>
    api.post(`/admin/needs/${id}/take-down`, { reason, note: note || undefined }).then(() => undefined),

  getReports: (status: ReportStatus, page = 1, pageSize = 20): Promise<Paged<AdminReport>> =>
    api.get('/admin/reports', { params: { status, page, pageSize } }).then((res) => toPaged<AdminReport>(res.data)),

  resolveReport: (id: number, action: ReportAction, note?: string): Promise<void> =>
    api.post(`/admin/reports/${id}/resolve`, { action, note: note || undefined }).then(() => undefined),

  getUsers: (params: { search?: string; suspendedOnly?: boolean; page?: number; pageSize?: number } = {}): Promise<Paged<AdminUser>> =>
    api.get('/admin/users', { params: clean(params) }).then((res) => toPaged<AdminUser>(res.data)),

  suspendUser: (id: string, reason: string): Promise<void> =>
    api.post(`/admin/users/${id}/suspend`, { reason }).then(() => undefined),

  unsuspendUser: (id: string): Promise<void> => api.post(`/admin/users/${id}/unsuspend`).then(() => undefined),

  getKeywords: (): Promise<string[]> =>
    api.get('/admin/moderation/keywords').then((res) =>
      Array.isArray(res.data) ? res.data : Array.isArray(res.data?.keywords) ? res.data.keywords : [],
    ),

  saveKeywords: (keywords: string[]): Promise<string[]> =>
    api.put('/admin/moderation/keywords', { keywords }).then((res) =>
      Array.isArray(res.data?.keywords) ? res.data.keywords : keywords,
    ),
};
