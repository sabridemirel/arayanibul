import { useCallback, useRef, useState } from 'react';
import type { ToastData } from '../components/ui/Toast';

export const useToast = () => {
  const [toast, setToast] = useState<ToastData | null>(null);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, variant: ToastData['variant'] = 'success') => {
    idRef.current += 1;
    setToast({ id: idRef.current, message, variant });
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  return { toast, showToast, hideToast };
};
