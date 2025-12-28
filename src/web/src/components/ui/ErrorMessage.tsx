import React from 'react';
import { XCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onDismiss,
  className = '',
}) => {
  if (!message) return null;

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg
        bg-red-50 border border-red-200
        ${className}
      `}
      role="alert"
    >
      <XCircleIcon className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-red-800">{message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
          aria-label="Kapat"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
