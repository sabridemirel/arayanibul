import { useCallback, useEffect, useState } from 'react';
import { NoSymbolIcon } from '@heroicons/react/24/outline';
import { Button, Card, ErrorMessage, Loading, Modal } from './ui';
import { blockAPI } from '../services/moderation';
import type { BlockedUser } from '../services/moderation';
import { getApiErrorMessage } from '../services/api';

const formatDate = (value: string) => {
  const d = new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

/** Profile section: users I blocked, with "Engeli Kaldır" */
const BlockedUsersCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [items, setItems] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<BlockedUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await blockAPI.list());
    } catch {
      setError('Engellenen kullanıcılar yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const unblock = async () => {
    if (!target) return;
    setBusy(true);
    setActionError(null);
    try {
      await blockAPI.unblock(target.userId);
      setItems((current) => current.filter((b) => b.userId !== target.userId));
      setNotice(`${target.fullName} için engel kaldırıldı.`);
      setTarget(null);
    } catch (err) {
      setActionError(getApiErrorMessage(err) || 'Engel kaldırılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="lg" className={className}>
      <h2 className="text-lg font-semibold text-text mb-1">Engellenen Kullanıcılar</h2>
      <p className="text-sm text-text-secondary mb-4">
        Engellediğiniz kullanıcılar size mesaj gönderemez ve ilanlarınıza teklif veremez.
      </p>

      {notice && (
        <p className="text-sm text-success mb-3" role="status">
          {notice}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Loading size="sm" />
        </div>
      ) : error ? (
        <div className="space-y-3">
          <ErrorMessage message={error} />
          <Button variant="outline" size="sm" onClick={load}>
            Tekrar Dene
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <NoSymbolIcon className="h-5 w-5" />
          Engellediğiniz kullanıcı yok.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((b) => (
            <li key={b.userId} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium text-text truncate">{b.fullName}</p>
                {b.blockedAt && (
                  <p className="text-xs text-text-secondary">{formatDate(b.blockedAt)} tarihinde engellendi</p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActionError(null);
                  setTarget(b);
                }}
              >
                Engeli Kaldır
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={!!target}
        onClose={() => setTarget(null)}
        locked={busy}
        title="Engeli Kaldır"
        description={`${target?.fullName ?? 'Bu kullanıcı'} size yeniden mesaj gönderebilecek ve teklif verebilecek.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={busy}>
              Vazgeç
            </Button>
            <Button onClick={unblock} isLoading={busy}>
              Engeli Kaldır
            </Button>
          </>
        }
      >
        {actionError ? <ErrorMessage message={actionError} /> : null}
      </Modal>
    </Card>
  );
};

export default BlockedUsersCard;
