import { useState } from 'react';
import { Badge, Button, ErrorMessage, Modal } from '../../components/ui';
import { MODERATION_REASONS, NEED_STATUS_LABELS, NEED_STATUS_TONES } from '../../services/moderation';
import type { ModerationReason } from '../../services/moderation';
import { splitByTerms } from './format';

export const NeedStatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <Badge variant={NEED_STATUS_TONES[status] ?? 'default'}>{NEED_STATUS_LABELS[status] ?? status}</Badge>
);

export const Highlighted: React.FC<{ text: string; terms: string[] }> = ({ text, terms }) => (
  <>
    {splitByTerms(text, terms).map((part, i) =>
      part.match ? (
        <mark key={i} className="bg-amber-200 text-text rounded px-0.5">
          {part.text}
        </mark>
      ) : (
        <span key={i}>{part.text}</span>
      ),
    )}
  </>
);

interface ReasonDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (reason: ModerationReason, note: string) => void | Promise<void>;
  busy?: boolean;
}

/** Reason picker + note; the note is required when "Diğer" is selected */
export const ReasonDialog: React.FC<ReasonDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  busy = false,
}) => {
  const [reason, setReason] = useState<ModerationReason | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setReason(null);
    setNote('');
    setError(null);
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError('Lütfen bir neden seçin.');
      return;
    }
    if (reason === 'Other' && !note.trim()) {
      setError('"Diğer" seçildiğinde açıklama zorunludur.');
      return;
    }
    await onConfirm(reason, note.trim());
    setReason(null);
    setNote('');
    setError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title={title} description={description} locked={busy}>
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        <div className="space-y-2" role="radiogroup" aria-label="Neden">
          {MODERATION_REASONS.map((option, index) => (
            <label
              key={option.value}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                reason === option.value ? 'border-primary bg-primary-light' : 'border-border hover:border-primary/50'
              }`}
            >
              <input
                type="radio"
                name="moderation-reason"
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
                className="accent-primary"
                autoFocus={index === 0}
              />
              <span className="text-sm text-text flex-1">{option.label}</span>
            </label>
          ))}
        </div>
        <div>
          <label htmlFor="moderation-note" className="block text-sm font-medium text-text mb-1">
            Kullanıcıya not{' '}
            <span className="text-text-secondary font-normal">
              {reason === 'Other' ? '(zorunlu)' : '(isteğe bağlı)'}
            </span>
          </label>
          <textarea
            id="moderation-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="İlan sahibine gösterilir."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button type="button" variant="ghost" onClick={close} disabled={busy}>
            Vazgeç
          </Button>
          <Button type="submit" variant="danger" isLoading={busy}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  variant?: 'danger' | 'primary';
  onClose: () => void;
  onConfirm: (note: string) => void | Promise<void>;
  busy?: boolean;
  /** Show a note field: 'optional' | 'required' */
  noteMode?: 'none' | 'optional' | 'required';
  noteLabel?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  variant = 'danger',
  onClose,
  onConfirm,
  busy = false,
  noteMode = 'none',
  noteLabel = 'Not',
}) => {
  const [note, setNote] = useState('');

  const close = () => {
    if (busy) return;
    setNote('');
    onClose();
  };

  const canConfirm = noteMode !== 'required' || note.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={close} title={title} locked={busy}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canConfirm) return;
          await onConfirm(note.trim());
          setNote('');
        }}
      >
        <div className="text-sm text-text-secondary">{message}</div>
        {noteMode !== 'none' && (
          <div>
            <label htmlFor="confirm-note" className="block text-sm font-medium text-text mb-1">
              {noteLabel}{' '}
              <span className="text-text-secondary font-normal">
                {noteMode === 'required' ? '(zorunlu)' : '(isteğe bağlı)'}
              </span>
            </label>
            <textarea
              id="confirm-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              autoFocus
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button type="button" variant="ghost" onClick={close} disabled={busy}>
            Vazgeç
          </Button>
          <Button type="submit" variant={variant} isLoading={busy} disabled={!canConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

interface PagerProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onChange: (page: number) => void;
}

export const Pager: React.FC<PagerProps> = ({ page, pageSize, totalCount, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-4 text-sm text-text-secondary">
      <span>
        Toplam {totalCount} kayıt · Sayfa {page} / {totalPages}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Önceki
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Sonraki
        </Button>
      </div>
    </div>
  );
};

export const LoadError: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="space-y-3">
    <ErrorMessage message={message} />
    <Button variant="outline" size="sm" onClick={onRetry}>
      Tekrar Dene
    </Button>
  </div>
);
