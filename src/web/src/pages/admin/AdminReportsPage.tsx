import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FlagIcon } from '@heroicons/react/24/outline';
import { Badge, Button, Card, Loading } from '../../components/ui';
import { adminAPI, REPORT_REASONS } from '../../services/moderation';
import type { AdminReport, Paged, ReportAction, ReportStatus } from '../../services/moderation';
import { getApiErrorMessage } from '../../services/api';
import { useAdmin } from './adminContext';
import { ConfirmDialog, LoadError, Pager } from './AdminWidgets';
import { formatDateTime, formatRelative } from './format';

const TABS: { key: ReportStatus; label: string }[] = [
  { key: 'Open', label: 'Açık' },
  { key: 'Resolved', label: 'Çözüldü' },
  { key: 'Dismissed', label: 'Reddedildi' },
];

const TARGET_LABELS: Record<string, string> = {
  Need: 'İlan',
  Message: 'Mesaj',
  User: 'Kullanıcı',
};

const ACTION_COPY: Record<ReportAction, { title: string; confirm: string; message: string; done: string }> = {
  Dismiss: {
    title: 'Şikayeti Yoksay',
    confirm: 'Yoksay',
    message: 'Şikayet işlem yapılmadan kapatılacak.',
    done: 'Şikayet yoksayıldı.',
  },
  TakeDownNeed: {
    title: 'İlanı Kaldır',
    confirm: 'İlanı Kaldır',
    message: 'Şikayet edilen ilan yayından kaldırılacak ve şikayet çözüldü olarak işaretlenecek.',
    done: 'İlan kaldırıldı, şikayet çözüldü.',
  },
  SuspendUser: {
    title: 'Kullanıcıyı Askıya Al',
    confirm: 'Askıya Al',
    message: 'Şikayet edilen kullanıcı askıya alınacak ve şikayet çözüldü olarak işaretlenecek.',
    done: 'Kullanıcı askıya alındı, şikayet çözüldü.',
  },
};

const reasonLabel = (report: AdminReport) =>
  report.reasonText || REPORT_REASONS.find((r) => r.value === report.reason)?.label || report.reason;

const TargetSummary: React.FC<{ report: AdminReport }> = ({ report }) => {
  const t = report.target ?? {};
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-center gap-2">
        <Badge variant="default">{TARGET_LABELS[report.targetType] ?? report.targetType}</Badge>
        {t.userName && <span className="text-sm text-text truncate">{t.userName}</span>}
      </div>
      {t.title && <p className="text-sm font-medium text-text line-clamp-2">{t.title}</p>}
      {t.content && (
        <p className="text-sm text-text-secondary bg-background border border-border rounded px-2 py-1 line-clamp-3 whitespace-pre-wrap break-words">
          {t.content}
        </p>
      )}
      <div className="flex flex-wrap gap-3 text-xs">
        {t.needId && (
          <Link to={`/needs/${t.needId}`} target="_blank" className="text-primary hover:text-primary-dark font-medium">
            İlanı Gör
          </Link>
        )}
      </div>
    </div>
  );
};

const AdminReportsPage: React.FC = () => {
  const { refreshStats, bumpStat, showToast } = useAdmin();
  const [tab, setTab] = useState<ReportStatus>('Open');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<AdminReport> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ report: AdminReport; action: ReportAction } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminAPI.getReports(tab, page));
    } catch {
      setError('Şikayetler yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [tab, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolve = async (note: string) => {
    if (!pending) return;
    setBusy(true);
    try {
      await adminAPI.resolveReport(pending.report.id, pending.action, note || undefined);
      showToast(ACTION_COPY[pending.action].done);
      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.filter((r) => r.id !== pending.report.id),
              totalCount: Math.max(0, current.totalCount - 1),
            }
          : current,
      );
      bumpStat('openReports', -1);
      setPending(null);
      refreshStats();
    } catch (err) {
      showToast(getApiErrorMessage(err) || 'İşlem tamamlanamadı. Tekrar deneyin.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const copy = pending ? ACTION_COPY[pending.action] : null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text">Şikayetler</h1>

      <div className="flex gap-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-primary text-white' : 'bg-surface border border-border text-text hover:bg-background'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <LoadError message={error} onRetry={load} />
      ) : loading && !data ? (
        <div className="flex justify-center py-12">
          <Loading text="Şikayetler yükleniyor..." />
        </div>
      ) : !data || data.items.length === 0 ? (
        <Card className="text-center py-12">
          <FlagIcon className="h-10 w-10 text-text-secondary mx-auto mb-2" />
          <p className="text-text-secondary">
            {tab === 'Open' ? 'Açık şikayet yok.' : 'Bu listede şikayet yok.'}
          </p>
        </Card>
      ) : (
        <div className={`space-y-3 ${loading ? 'opacity-60' : ''}`}>
          {data.items.map((report) => (
            <Card key={report.id} className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr_auto] gap-4">
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-text">{reasonLabel(report)}</p>
                {report.note && <p className="text-text-secondary whitespace-pre-wrap break-words">"{report.note}"</p>}
                <p className="text-xs text-text-secondary">
                  {report.reporter?.fullName || 'Kullanıcı'} · {formatDateTime(report.createdAt)} (
                  {formatRelative(report.createdAt)})
                </p>
                {report.status !== 'Open' && (
                  <p className="text-xs text-text-secondary">
                    Kapatıldı: {formatDateTime(report.resolvedAt)}
                    {report.resolutionNote ? ` – ${report.resolutionNote}` : ''}
                  </p>
                )}
              </div>
              <TargetSummary report={report} />
              {report.status === 'Open' && (
                <div className="flex lg:flex-col gap-2 lg:items-stretch flex-wrap">
                  <Button size="sm" variant="ghost" onClick={() => setPending({ report, action: 'Dismiss' })}>
                    Yoksay
                  </Button>
                  {report.targetType === 'Need' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="!border-error !text-error hover:!bg-red-50"
                      onClick={() => setPending({ report, action: 'TakeDownNeed' })}
                    >
                      İlanı Kaldır
                    </Button>
                  )}
                  <Button size="sm" variant="danger" onClick={() => setPending({ report, action: 'SuspendUser' })}>
                    Kullanıcıyı Askıya Al
                  </Button>
                </div>
              )}
            </Card>
          ))}
          <Pager page={data.page} pageSize={data.pageSize} totalCount={data.totalCount} onChange={setPage} />
        </div>
      )}

      <ConfirmDialog
        isOpen={!!pending}
        title={copy?.title ?? ''}
        message={copy?.message ?? ''}
        confirmLabel={copy?.confirm ?? ''}
        variant={pending?.action === 'Dismiss' ? 'primary' : 'danger'}
        noteMode="optional"
        noteLabel="Not"
        busy={busy}
        onClose={() => setPending(null)}
        onConfirm={resolve}
      />
    </div>
  );
};

export default AdminReportsPage;
