import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowTopRightOnSquareIcon, ExclamationTriangleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Button, Card, Input, Loading } from '../../components/ui';
import { adminAPI, NEED_STATUS_LABELS } from '../../services/moderation';
import type { AdminNeedItem, ModerationReason, Paged } from '../../services/moderation';
import { getApiErrorMessage } from '../../services/api';
import { useAdmin } from './adminContext';
import { LoadError, NeedStatusBadge, Pager, ReasonDialog } from './AdminWidgets';
import { formatBudget, formatDateTime } from './format';

const PAGE_SIZE = 20;
const STATUS_FILTERS = ['', 'PendingReview', 'Active', 'InProgress', 'Completed', 'Rejected', 'Cancelled', 'Expired'];

const AdminNeedsPage: React.FC = () => {
  const { refreshStats, showToast } = useAdmin();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<AdminNeedItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [takeDownTarget, setTakeDownTarget] = useState<AdminNeedItem | null>(null);
  const [busy, setBusy] = useState(false);

  // Debounce the search box
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminAPI.getNeeds({ status: status || undefined, search, flaggedOnly, page, pageSize: PAGE_SIZE }));
    } catch {
      setError('İlanlar yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [status, search, flaggedOnly, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmTakeDown = async (reason: ModerationReason, note: string) => {
    if (!takeDownTarget) return;
    setBusy(true);
    try {
      await adminAPI.takeDownNeed(takeDownTarget.id, reason, note || undefined);
      showToast(`"${takeDownTarget.title}" yayından kaldırıldı.`);
      setTakeDownTarget(null);
      refreshStats();
      void load();
    } catch (err) {
      showToast(getApiErrorMessage(err) || 'İlan kaldırılamadı. Tekrar deneyin.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text">İlanlar</h1>

      <Card className="flex flex-col lg:flex-row lg:items-end gap-3">
        <Input
          name="admin-need-search"
          label="Ara"
          placeholder="Başlık, açıklama veya kullanıcı"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
          className="lg:flex-1"
        />
        <div>
          <label htmlFor="admin-need-status" className="block text-sm font-medium text-text mb-1">
            Durum
          </label>
          <select
            id="admin-need-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full lg:w-48 rounded-lg border border-border bg-surface px-3 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s ? NEED_STATUS_LABELS[s] : 'Tüm Durumlar'}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-text pb-2.5">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => {
              setFlaggedOnly(e.target.checked);
              setPage(1);
            }}
            className="accent-primary h-4 w-4"
          />
          Sadece işaretlenenler
        </label>
      </Card>

      {error ? (
        <LoadError message={error} onRetry={load} />
      ) : loading && !data ? (
        <div className="flex justify-center py-12">
          <Loading text="İlanlar yükleniyor..." />
        </div>
      ) : !data || data.items.length === 0 ? (
        <Card className="text-center py-12 text-text-secondary">Bu filtrelere uygun ilan bulunamadı.</Card>
      ) : (
        <Card padding="none" className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-text-secondary">
              <tr>
                <th className="px-4 py-2.5 font-medium">İlan</th>
                <th className="px-4 py-2.5 font-medium">Sahibi</th>
                <th className="px-4 py-2.5 font-medium">Durum</th>
                <th className="px-4 py-2.5 font-medium">Oluşturulma</th>
                <th className="px-4 py-2.5 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((need) => (
                <tr key={need.id} className="align-top">
                  <td className="px-4 py-3 max-w-md">
                    <div className="flex items-start gap-1.5">
                      {need.flaggedTerms.length > 0 && (
                        <ExclamationTriangleIcon
                          className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5"
                          title={`İşaretlenen: ${need.flaggedTerms.join(', ')}`}
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-text line-clamp-2">{need.title}</p>
                        <p className="text-xs text-text-secondary">
                          {need.categoryName} · {formatBudget(need.minBudget, need.maxBudget, need.currency)}
                        </p>
                        {need.status === 'Rejected' && need.rejectionReasonText && (
                          <p className="text-xs text-error mt-0.5">
                            {need.rejectionReasonText}
                            {need.rejectionNote ? ` – ${need.rejectionNote}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-text">{need.user?.fullName}</p>
                    <p className="text-xs text-text-secondary break-all">{need.user?.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <NeedStatusBadge status={need.status} />
                  </td>
                  <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{formatDateTime(need.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {need.status !== 'PendingReview' && need.status !== 'Rejected' && (
                        <Link
                          to={`/needs/${need.id}`}
                          target="_blank"
                          className="p-1.5 text-text-secondary hover:text-primary"
                          aria-label="İlanı Gör"
                          title="İlanı Gör"
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        </Link>
                      )}
                      {need.status === 'Active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="!border-error !text-error hover:!bg-red-50 whitespace-nowrap"
                          onClick={() => setTakeDownTarget(need)}
                        >
                          Yayından Kaldır
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 pb-4">
            <Pager page={data.page} pageSize={data.pageSize} totalCount={data.totalCount} onChange={setPage} />
          </div>
        </Card>
      )}

      <ReasonDialog
        isOpen={!!takeDownTarget}
        title="İlanı Yayından Kaldır"
        description={takeDownTarget ? `"${takeDownTarget.title}" yayından kaldırılacak. Neden ilan sahibine gösterilir.` : undefined}
        confirmLabel="Yayından Kaldır"
        busy={busy}
        onClose={() => setTakeDownTarget(null)}
        onConfirm={confirmTakeDown}
      />
    </div>
  );
};

export default AdminNeedsPage;
