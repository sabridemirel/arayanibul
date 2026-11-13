import { useEffect, useId } from 'react';
import type { ReactNode } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Blocks closing via backdrop / Escape (e.g. while a request is running) */
  locked?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  locked = false,
}) => {
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked) {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, locked, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={() => !locked && onClose()}
      data-modal-open="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-surface rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5">
          <div>
            <h3 id={titleId} className="text-lg font-semibold text-text">
              {title}
            </h3>
            {description && <div className="text-sm text-text-secondary mt-1">{description}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            className="p-1 -mr-1 rounded text-text-secondary hover:text-text disabled:opacity-50"
            aria-label="Kapat"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        {children && <div className="px-6 py-4 overflow-y-auto">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 px-6 pb-5 pt-2">{footer}</div>
        )}
      </div>
    </div>
  );
};

export default Modal;
