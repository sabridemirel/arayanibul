import { useOutletContext } from 'react-router-dom';
import type { AdminStats } from '../../services/moderation';
import type { ToastData } from '../../components/ui/Toast';

export interface AdminOutletContext {
  stats: AdminStats | null;
  refreshStats: () => void;
  /** Adjusts a counter locally (optimistic) until the next refresh */
  bumpStat: (key: keyof AdminStats, delta: number) => void;
  showToast: (message: string, variant?: ToastData['variant']) => void;
}

export const useAdmin = () => useOutletContext<AdminOutletContext>();
