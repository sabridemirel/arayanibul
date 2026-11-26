import { useState } from 'react';
import { BellAlertIcon, BellSlashIcon } from '@heroicons/react/24/outline';
import { needAPI, offerAPI } from '../../services/api';
import type { Need, Offer, PriceWatchState } from '../../services/api';
import { Button } from '../ui';

interface FixedPricePanelProps {
  need: Need;
  onOffered: (offer: Offer) => void;
  onWatchChange: (state: PriceWatchState) => void;
  onMessage: (message: string, type?: 'success' | 'error') => void;
}

const errorText = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

/**
 * Seller's side of a "bu fiyata hemen alırım" listing: take the price with one confirmation, or
 * ask to hear when the buyer changes it. No other price can be offered.
 */
const FixedPricePanel: React.FC<FixedPricePanelProps> = ({ need, onOffered, onWatchChange, onMessage }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingWatch, setIsSavingWatch] = useState(false);
  const price = `${(need.maxBudget ?? 0).toLocaleString('tr-TR')} TL`;

  const sell = async () => {
    setIsSending(true);
    try {
      onOffered(await offerAPI.createAtListedPrice(need.id));
      onMessage('Teklifiniz gönderildi');
    } catch (err) {
      onMessage(errorText(err, 'Teklif gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'), 'error');
    } finally {
      setIsSending(false);
      setIsConfirming(false);
    }
  };

  const toggleWatch = async () => {
    setIsSavingWatch(true);
    try {
      const state = need.isWatchingPrice ? await needAPI.unwatchPrice(need.id) : await needAPI.watchPrice(need.id);
      onWatchChange(state);
      onMessage(state.isWatchingPrice ? 'Fiyat değişince size haber vereceğiz' : 'Fiyat takibi kapatıldı');
    } catch (err) {
      onMessage(errorText(err, 'İşlem tamamlanamadı. Tekrar deneyin.'), 'error');
    } finally {
      setIsSavingWatch(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-medium text-text-secondary">Alıcının fiyatı</p>
      <p className="text-3xl font-extrabold text-primary">{price}</p>
      <p className="mt-1 mb-4 text-sm text-text-secondary">
        Bu alıcı pazarlık yapmıyor; yalnızca bu fiyata satan satıcıdan teklif alıyor.
      </p>

      {isConfirming ? (
        <div className="rounded-xl border border-primary bg-primary-light p-4" role="group" aria-label="Teklifi onayla">
          <p className="text-sm text-text">
            <strong>{price}</strong> üzerinden teklif veriyorsunuz. Alıcı kabul ederse ayrıntıları mesajlaşarak
            netleştirirsiniz.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="primary" fullWidth onClick={sell} isLoading={isSending} disabled={isSending}>
              Teklifi Gönder
            </Button>
            <Button variant="outline" fullWidth onClick={() => setIsConfirming(false)} disabled={isSending}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="primary" size="lg" fullWidth onClick={() => setIsConfirming(true)}>
          Bende Var, Bu Fiyata Satarım
        </Button>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <p className="mb-2 text-sm text-text-secondary">
          {need.isWatchingPrice
            ? 'Alıcı fiyatı artırır ya da ilanı pazarlığa açarsa size haber vereceğiz.'
            : 'Fiyat size düşük mü geliyor? Alıcıya bunu bildirelim; fiyat değişince haber verelim.'}
        </p>
        <Button
          variant="outline"
          fullWidth
          onClick={toggleWatch}
          isLoading={isSavingWatch}
          disabled={isSavingWatch}
          leftIcon={
            need.isWatchingPrice ? (
              <BellSlashIcon className="h-5 w-5" aria-hidden="true" />
            ) : (
              <BellAlertIcon className="h-5 w-5" aria-hidden="true" />
            )
          }
        >
          {need.isWatchingPrice ? 'Fiyat Takibini Kapat' : 'Fiyat Artarsa Haber Ver'}
        </Button>
      </div>
    </div>
  );
};

export default FixedPricePanel;
