import { colors } from '../theme';

// Badge labels for every need status (see turkish-ui-copy skill)
export const NEED_STATUS_LABELS: Record<string, string> = {
  PendingReview: 'Onay Bekliyor',
  Rejected: 'Yayınlanmadı',
  Active: 'Aktif',
  InProgress: 'Devam Ediyor',
  Completed: 'Tamamlandı',
  Cancelled: 'İptal Edildi',
  Expired: 'Süresi Doldu',
};

export const getNeedStatusText = (status: string) => NEED_STATUS_LABELS[status] ?? status;

export const getNeedStatusColor = (status: string) => {
  switch (status) {
    case 'PendingReview':
      return colors.info;
    case 'Active':
      return colors.success;
    case 'InProgress':
      return colors.warning;
    case 'Completed':
      return colors.primary;
    case 'Rejected':
    case 'Cancelled':
    case 'Expired':
      return colors.error;
    default:
      return colors.textSecondary;
  }
};

export const PENDING_REVIEW_HELP =
  'İlanınız inceleniyor. Onaylandığında yayınlanacak ve size bildirim gelecek.';

// Statuses in which the owner may still edit a need (mirrors the backend rule)
export const EDITABLE_NEED_STATUSES = ['Active', 'PendingReview', 'Rejected'];

export const isNeedEditable = (status?: string) =>
  !!status && EDITABLE_NEED_STATUSES.includes(status);
