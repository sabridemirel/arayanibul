import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Button, Card, Loading } from '../../components/ui';
import { adminAPI } from '../../services/moderation';
import type { AdminProduct } from '../../services/moderation';
import { getApiErrorMessage } from '../../services/api';
import { useAdmin } from './adminContext';
import { LoadError } from './AdminWidgets';

const digitsOnly = (value: string) => value.replace(/\D/g, '');

interface Row {
  product: AdminProduct;
  /** Ceiling as typed (digits only); empty means "use the default ceiling" */
  ceiling: string;
  isActive: boolean;
}

const toRow = (product: AdminProduct): Row => ({
  product,
  ceiling: product.ceilingPrice ? String(Math.round(product.ceilingPrice)) : '',
  isActive: product.isActive,
});

const isDirty = (row: Row) =>
  row.ceiling !== (row.product.ceilingPrice ? String(Math.round(row.product.ceilingPrice)) : '') ||
  row.isActive !== row.product.isActive;

/** Price ceilings and visibility of the "Gerçek Fiyat" product pages. */
const AdminProductsPage: React.FC = () => {
  const { showToast } = useAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows((await adminAPI.getProducts()).map(toRow));
    } catch {
      setError('Ürün listesi yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (id: number, changes: Partial<Pick<Row, 'ceiling' | 'isActive'>>) =>
    setRows((current) => current.map((row) => (row.product.id === id ? { ...row, ...changes } : row)));

  const save = async (row: Row) => {
    setSavingId(row.product.id);
    try {
      const saved = await adminAPI.updateProduct(row.product.id, {
        ceilingPrice: row.ceiling ? Number(row.ceiling) : null,
        isActive: row.isActive,
      });
      setRows((current) => current.map((item) => (item.product.id === saved.id ? toRow(saved) : item)));
      showToast(`${saved.name} kaydedildi.`);
    } catch (err) {
      showToast(getApiErrorMessage(err) || 'Ürün kaydedilemedi. Tekrar deneyin.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loading text="Ürünler yükleniyor..." />
      </div>
    );
  }

  if (error) return <LoadError message={error} onRetry={load} />;

  const withoutCeiling = rows.filter((row) => row.isActive && !row.product.ceilingPrice).length;

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-xl font-bold text-text">Ürünler ve Tavan Fiyatlar</h1>

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <InformationCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div className="space-y-1">
          <p>
            Tavan fiyat, alıcıların bir ürüne verebileceği en yüksek tutardır; üstündeki fiyatlar reddedilir. Sahte
            yüksek fiyatlara karşı ilk önlem budur. Örneğin ürünün sıfır piyasa fiyatını yazın.
          </p>
          <p>
            Tavanı boş bırakılan ürünlerde genel tavan (250.000 TL) geçerlidir.
            {withoutCeiling > 0 && <> Şu an yayındaki {withoutCeiling} ürünün tavanı girilmemiş.</>}
          </p>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th scope="col" className="px-2 py-2 font-medium">Ürün</th>
                <th scope="col" className="px-2 py-2 font-medium">Tavan fiyat (TL)</th>
                <th scope="col" className="px-2 py-2 font-medium">Yayında</th>
                <th scope="col" className="px-2 py-2 font-medium">
                  <span className="sr-only">İşlem</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.product.id} className="border-b border-border last:border-0">
                  <th scope="row" className="px-2 py-2 text-left font-semibold text-text">
                    <Link to={`/fiyat/${row.product.slug}`} className="hover:text-primary hover:underline">
                      {row.product.name}
                    </Link>
                  </th>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label={`${row.product.name} tavan fiyatı`}
                      placeholder="Genel tavan"
                      value={row.ceiling ? Number(row.ceiling).toLocaleString('tr-TR') : ''}
                      onChange={(event) => update(row.product.id, { ceiling: digitsOnly(event.target.value) })}
                      className="w-36 rounded-lg border border-border bg-surface px-3 py-2 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      aria-label={`${row.product.name} fiyat sayfası yayında`}
                      checked={row.isActive}
                      onChange={(event) => update(row.product.id, { isActive: event.target.checked })}
                      className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button
                      size="sm"
                      onClick={() => save(row)}
                      disabled={!isDirty(row) || savingId === row.product.id}
                      isLoading={savingId === row.product.id}
                    >
                      Kaydet
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminProductsPage;
