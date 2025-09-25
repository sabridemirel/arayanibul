import { useState, useCallback } from 'react';

interface InAppNotificationState {
  visible: boolean;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  onPress?: () => void;
}

export const useInAppNotification = () => {
  const [notification, setNotification] = useState<InAppNotificationState>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const showNotification = useCallback((
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    onPress?: () => void
  ) => {
    setNotification({
      visible: true,
      title,
      message,
      type,
      onPress,
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  const showSuccess = useCallback((title: string, message: string, onPress?: () => void) => {
    showNotification(title, message, 'success', onPress);
  }, [showNotification]);

  const showError = useCallback((title: string, message: string, onPress?: () => void) => {
    showNotification(title, message, 'error', onPress);
  }, [showNotification]);

  const showWarning = useCallback((title: string, message: string, onPress?: () => void) => {
    showNotification(title, message, 'warning', onPress);
  }, [showNotification]);

  const showInfo = useCallback((title: string, message: string, onPress?: () => void) => {
    showNotification(title, message, 'info', onPress);
  }, [showNotification]);

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};