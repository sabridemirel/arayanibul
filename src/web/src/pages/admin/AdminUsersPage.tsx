import { useCallback, useEffect, useState } from 'react';
import { MagnifyingGlassIcon, UsersIcon } from '@heroicons/react/24/outline';
import { Badge, Button, Card, Input, Loading } from '../../components/ui';
import { adminAPI } from '../../services/moderation';
import type { AdminUser, Paged } from '../../services/moderation';
import { getApiErrorMessage } from '../../services/api';
import { useAdmin } from './adminContext';
import { ConfirmDialog, LoadError, Pager } from './AdminWidgets';
import { formatDate } from './format';

const PAGE_SIZE = 20;

const isAdminUser = (u: AdminUser) => (u.roles ?? []).some((r) => r.toLowerCase() === 'admin');

const AdminUsersPage: React.FC = () => {
  const { refreshStats, showToast } = useAdmin();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [suspendedOnly, setSuspendedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<AdminUser> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ user: AdminUser; action: 'suspend' | 'unsuspend' } | null>(null);
  const [busy, setBusy] = useState(false);

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
      setData(await adminAPI.getUsers({ search, suspendedOnly, page, pageSize: PAGE_SIZE }));
    } catch {
      setError('Kullanıcılar yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [search, suspendedOnly, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const confirm = async (note: string) => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.action === 'suspend') {
        await adminAPI.suspendUser(pending.user.id, note);
        showToast(`${pending.user.fullName} askıya alındı.`);
      } else {
        await adminAPI.unsuspendUser(pending.user.id);
        showToast(`${pending.user.fullName} için askı kaldırıldı.`);
      }
      setPending(null);
      refreshStats();
      void load();
    } catch (err) {
      showToast(getApiErrorMessage(err) || 'İşlem tamamlanamadı. Tekrar deneyin.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text">Kullanıcılar</h1>

      <Card className="flex flex-col sm:flex-row sm:items-end gap-3">
        <Input
          name="admin-user-search"
          label="Ara"
          placeholder="Ad, soyad veya e-posta"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
          className="sm:flex-1"
        />
        <label className="flex items-center gap-2 text-sm text-text pb-2.5">
          <input
            type="checkbox"
            checked={suspendedOnly}
            onChange={(e) => {
              setSuspendedOnly(e.target.checked);
              setPage(1);
            }}
            className="accent-primary h-4 w-4"
          />
          Sadece askıdakiler
        </label>
      </Card>

      {error ? (
        <LoadError message={error} onRetry={load} />
      ) : loading && !data ? (
        <div className="flex justify-center py-12">
          <Loading text="Kullanıcılar yükleniyor..." />
        </div>
      ) : !data || data.items.length === 0 ? (
        <Card className="text-center py-12">
          <UsersIcon className="h-10 w-10 text-text-secondary mx-auto mb-2" />
          <p className="text-text-secondary">Bu filtrelere uygun kullanıcı bulunamadı.</p>
        </Card>
      ) : (
        <Card padding="none" className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-text-secondary">
              <tr>
                <th className="px-4 py-2.5 font-medium">Kullanıcı</th>
                <th className="px-4 py-2.5 font-medium">Üyelik</th>
                <th className="px-4 py-2.5 font-medium text-right">İlan</th>
                <th className="px-4 py-2.5 font-medium text-right">Reddedilen</th>
                <th className="px-4 py-2.5 font-medium text-right">Şikayet</th>
                <th className="px-4 py-2.5 font-medium">Durum</th>
                <th className="px-4 py-2.5 font-medium text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((u) => {
                const admin = isAdminUser(u);
                return (
                  <tr key={u.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text">{u.fullName}</p>
                        {admin && <Badge variant="primary">Yönetici</Badge>}
                      </div>
                      <p className="text-xs text-text-secondary break-all">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.totalNeeds}</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${u.rejectedNeeds > 0 ? 'text-error font-medium' : ''}`}>
                      {u.rejectedNeeds}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${u.reportCount > 0 ? 'text-amber-700 font-medium' : ''}`}>
                      {u.reportCount}
                    </td>
                    <td className="px-4 py-3">
                      {u.isSuspended ? (
                        <div>
                          <Badge variant="error">Askıda</Badge>
                          {u.suspendedReason && (
                            <p className="text-xs text-text-secondary mt-1 max-w-xs break-words">{u.suspendedReason}</p>
                          )}
                        </div>
                      ) : (
                        <Badge variant="success">Aktif</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!admin &&
                        (u.isSuspended ? (
                          <Button size="sm" variant="outline" onClick={() => setPending({ user: u, action: 'unsuspend' })}>
                            Askıyı Kaldır
                          </Button>
                        ) : (
                          <Button size="sm" variant="danger" onClick={() => setPending({ user: u, action: 'suspend' })}>
                            Askıya Al
                          </Button>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 pb-4">
            <Pager page={data.page} pageSize={data.pageSize} totalCount={data.totalCount} onChange={setPage} />
          </div>
        </Card>
      )}

      <ConfirmDialog
        isOpen={!!pending}
        title={pending?.action === 'suspend' ? 'Kullanıcıyı Askıya Al' : 'Askıyı Kaldır'}
        message={
          pending?.action === 'suspend'
            ? `${pending.user.fullName} askıya alınacak. Askıdaki kullanıcılar ilan veremez, teklif veremez ve mesaj gönderemez.`
            : `${pending?.user.fullName ?? ''} yeniden platformu kullanabilecek.`
        }
        confirmLabel={pending?.action === 'suspend' ? 'Askıya Al' : 'Askıyı Kaldır'}
        variant={pending?.action === 'suspend' ? 'danger' : 'primary'}
        noteMode={pending?.action === 'suspend' ? 'required' : 'none'}
        noteLabel="Askıya alma nedeni"
        busy={busy}
        onClose={() => setPending(null)}
        onConfirm={confirm}
      />
    </div>
  );
};

export default AdminUsersPage;
