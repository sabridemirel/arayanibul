import { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface ToastData {
  id: number;
  message: string;
  variant?: 'success' | 'error';
}

interface ToastProps {
  toast: ToastData | null;
  onClose: () => void;
  duration?: number;
}

/** Single bottom-right notification that hides itself after `duration` ms */
const Toast: React.FC<ToastProps> = ({ toast, onClose, duration = 3500 }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [toast, onClose, duration]);

  if (!toast) return null;
  const isError = toast.variant === 'error';

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[60] flex justify-end pointer-events-none">
      <div
        role={isError ? 'alert' : 'status'}
        className={`pointer-events-auto flex items-start gap-3 rounded-lg shadow-lg px-4 py-3 max-w-sm border ${
          isError ? 'bg-red-50 border-red-200 text-red-900' : 'bg-green-50 border-green-200 text-green-900'
        }`}
      >
        {isError ? (
          <XCircleIcon className="h-5 w-5 text-error flex-shrink-0" />
        ) : (
          <CheckCircleIcon className="h-5 w-5 text-success flex-shrink-0" />
        )}
        <p className="text-sm flex-1">{toast.message}</p>
        <button type="button" onClick={onClose} className="opacity-70 hover:opacity-100" aria-label="Kapat">
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
