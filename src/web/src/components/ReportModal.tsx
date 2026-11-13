import { useState } from 'react';
import { Button, ErrorMessage, Modal } from './ui';
import { REPORT_REASONS, reportAPI } from '../services/moderation';
import type { ReportReason, ReportTargetType } from '../services/moderation';
import { getApiErrorMessage, getApiErrorStatus } from '../services/api';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string | number;
  /** Called with the server confirmation text after a successful report */
  onReported?: (message: string) => void;
}

const TITLES: Record<ReportTargetType, string> = {
  Need: 'İlanı Şikayet Et',
  Message: 'Mesajı Şikayet Et',
  User: 'Kullanıcıyı Şikayet Et',
};

const MAX_NOTE = 500;

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, targetType, targetId, onReported }) => {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setReason(null);
    setNote('');
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError('Lütfen bir şikayet nedeni seçin.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await reportAPI.create({
        targetType,
        targetId,
        reason,
        note: note.trim() || undefined,
      });
      reset();
      onReported?.(res?.message || 'Şikayetiniz alındı. İnceleyip gerekli işlemi yapacağız.');
      onClose();
    } catch (err) {
      const status = getApiErrorStatus(err);
      setError(
        status && status < 500 && getApiErrorMessage(err)
          ? getApiErrorMessage(err)!
          : 'Şikayetiniz gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      locked={submitting}
      title={TITLES[targetType]}
      description="Şikayetiniz ekibimiz tarafından incelenir. Şikayet ettiğiniz kişiye adınız gösterilmez."
    >
      <form id="report-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        <fieldset>
          <legend className="text-sm font-medium text-text mb-2">Şikayet nedeni</legend>
          <div className="space-y-2">
            {REPORT_REASONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  reason === option.value ? 'border-primary bg-primary-light' : 'border-border hover:border-primary/50'
                }`}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={option.value}
                  checked={reason === option.value}
                  onChange={() => setReason(option.value)}
                  className="accent-primary"
                />
                <span className="text-sm text-text">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="report-note" className="block text-sm font-medium text-text mb-1">
            Açıklama <span className="text-text-secondary font-normal">(isteğe bağlı)</span>
          </label>
          <textarea
            id="report-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_NOTE}
            rows={3}
            placeholder="Ekibimizin bilmesi gereken bir ayrıntı varsa yazın."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
            Vazgeç
          </Button>
          <Button type="submit" variant="danger" isLoading={submitting} disabled={!reason}>
            Şikayet Et
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ReportModal;
