import { useCallback, useEffect, useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Button, Card, Loading } from '../../components/ui';
import { adminAPI } from '../../services/moderation';
import { getApiErrorMessage } from '../../services/api';
import { useAdmin } from './adminContext';
import { LoadError } from './AdminWidgets';

const parseKeywords = (text: string) => {
  const seen = new Set<string>();
  const result: string[] = [];
  text.split('\n').forEach((line) => {
    const word = line.trim();
    const key = word.toLocaleLowerCase('tr-TR');
    if (word && !seen.has(key)) {
      seen.add(key);
      result.push(word);
    }
  });
  return result;
};

const AdminKeywordsPage: React.FC = () => {
  const { showToast } = useAdmin();
  const [text, setText] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const keywords = await adminAPI.getKeywords();
      const joined = keywords.join('\n');
      setText(joined);
      setSaved(joined);
    } catch {
      setError('Kelime listesi yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const keywords = parseKeywords(text);
  const dirty = keywords.join('\n') !== parseKeywords(saved).join('\n');

  const save = async () => {
    setSaving(true);
    try {
      const result = await adminAPI.saveKeywords(keywords);
      const joined = result.join('\n');
      setText(joined);
      setSaved(joined);
      showToast('Kelime listesi kaydedildi.');
    } catch (err) {
      showToast(getApiErrorMessage(err) || 'Kelime listesi kaydedilemedi. Tekrar deneyin.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loading text="Kelime listesi yükleniyor..." />
      </div>
    );
  }

  if (error) return <LoadError message={error} onRetry={load} />;

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold text-text">Kelime Listesi</h1>

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        <InformationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            Bu listedeki kelimeleri içeren ilanlar onay kuyruğunda işaretlenir ve en üstte gösterilir. Eşleştirme
            büyük/küçük harfe duyarlı değildir.
          </p>
          <p>Telefon numaraları ve e-posta adresleri listeye eklemeden otomatik olarak işaretlenir.</p>
        </div>
      </div>

      <Card>
        <label htmlFor="keyword-list" className="block text-sm font-medium text-text mb-1">
          Her satıra bir kelime veya ifade yazın
        </label>
        <textarea
          id="keyword-list"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          spellCheck={false}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <div className="flex items-center justify-between gap-3 mt-3">
          <span className="text-sm text-text-secondary">{keywords.length} kelime</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setText(saved)} disabled={!dirty || saving}>
              Değişiklikleri Geri Al
            </Button>
            <Button onClick={save} isLoading={saving} disabled={!dirty}>
              Kaydet
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminKeywordsPage;
