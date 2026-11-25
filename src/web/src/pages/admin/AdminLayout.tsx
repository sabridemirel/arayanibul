import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
  FlagIcon,
  UsersIcon,
  RectangleStackIcon,
  ListBulletIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../services/moderation';
import type { AdminStats } from '../../services/moderation';
import { Toast } from '../../components/ui';
import { useToast } from '../../hooks/useToast';
import type { AdminOutletContext } from './adminContext';

const CountBadge: React.FC<{ count?: number; tone?: 'primary' | 'warning' }> = ({ count, tone = 'primary' }) =>
  count && count > 0 ? (
    <span
      className={`ml-auto inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-bold ${
        tone === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-primary text-white'
      }`}
    >
      {count > 99 ? '99+' : count}
    </span>
  ) : null;

const StatTile: React.FC<{ label: string; value?: number; tone?: string }> = ({ label, value, tone = 'text-text' }) => (
  <div className="flex-1 min-w-[120px] rounded-lg border border-border bg-surface px-4 py-2.5">
    <p className="text-xs text-text-secondary">{label}</p>
    <p className={`text-xl font-bold tabular-nums ${tone}`}>{value ?? '–'}</p>
  </div>
);

const AdminLayout: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const { toast, showToast, hideToast } = useToast();

  const refreshStats = useCallback(() => {
    adminAPI
      .getStats()
      .then(setStats)
      .catch((err) => console.warn('[admin] stats failed', err));
  }, []);

  const bumpStat = useCallback((key: keyof AdminStats, delta: number) => {
    setStats((current) => (current ? { ...current, [key]: Math.max(0, (current[key] ?? 0) + delta) } : current));
  }, []);

  useEffect(() => {
    refreshStats();
    const timer = window.setInterval(refreshStats, 60000);
    return () => window.clearInterval(timer);
  }, [refreshStats]);

  const navItems = [
    { to: '/admin', end: true, label: 'Onay Kuyruğu', icon: ClipboardDocumentCheckIcon, count: stats?.pendingNeeds },
    { to: '/admin/reports', label: 'Şikayetler', icon: FlagIcon, count: stats?.openReports, tone: 'warning' as const },
    { to: '/admin/users', label: 'Kullanıcılar', icon: UsersIcon },
    { to: '/admin/needs', label: 'İlanlar', icon: RectangleStackIcon },
    { to: '/admin/keywords', label: 'Kelime Listesi', icon: ListBulletIcon },
    { to: '/admin/products', label: 'Ürünler ve Tavan Fiyatlar', icon: TagIcon },
  ];

  const context: AdminOutletContext = { stats, refreshStats, bumpStat, showToast };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="bg-[#5A189A] text-white">
        <div className="px-4 lg:px-6 h-14 flex items-center gap-4">
          <Link to="/admin" className="flex items-center gap-2">
            <img src="/assets/mascot.png" alt="" className="h-8 w-8 object-contain" />
            <span className="font-extrabold">
              Arayanı<span className="text-[#F59E0B]">BUL</span>
            </span>
            <span className="ml-1 text-xs font-semibold uppercase tracking-wide bg-white/15 rounded px-2 py-0.5">
              Yönetim
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="hidden sm:inline text-white/80">
              {user?.firstName} {user?.lastName}
            </span>
            <Link to="/" className="inline-flex items-center gap-1 text-white/80 hover:text-white">
              <ArrowLeftIcon className="h-4 w-4" />
              Siteye Dön
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Left nav */}
        <nav
          aria-label="Yönetim menüsü"
          className="md:w-56 lg:w-60 flex-shrink-0 border-b md:border-b-0 md:border-r border-border bg-surface"
        >
          <ul className="flex md:flex-col gap-1 p-2 md:p-3 overflow-x-auto">
            {navItems.map((item) => (
              <li key={item.to} className="flex-shrink-0">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive ? 'bg-primary-light text-primary' : 'text-text hover:bg-background'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                  <CountBadge count={item.count} tone={item.tone} />
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 min-w-0 flex flex-col">
          {/* Stats header */}
          <div className="flex flex-wrap gap-3 px-4 lg:px-6 pt-4">
            <StatTile label="Onay bekleyen" value={stats?.pendingNeeds} tone="text-primary" />
            <StatTile label="Açık şikayet" value={stats?.openReports} tone="text-amber-700" />
            <StatTile label="Askıdaki kullanıcı" value={stats?.suspendedUsers} />
            <StatTile label="Bugün onaylanan" value={stats?.approvedToday} tone="text-success" />
            <StatTile label="Bugün reddedilen" value={stats?.rejectedToday} tone="text-error" />
          </div>
          <div className="flex-1 min-h-0 px-4 lg:px-6 py-4">
            <Outlet context={context} />
          </div>
        </main>
      </div>

      <Toast toast={toast} onClose={hideToast} />
    </div>
  );
};

export default AdminLayout;
