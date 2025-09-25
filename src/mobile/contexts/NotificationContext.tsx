import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { notificationService, NotificationData } from '../services/notificationService';

interface NotificationContextType {
  notifications: InAppNotification[];
  unreadCount: number;
  isInitialized: boolean;
  expoPushToken: string | null;
  addNotification: (notification: InAppNotification) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  requestPermissions: () => Promise<boolean>;
}

interface InAppNotification {
  id: string;
  title: string;
  body: string;
  data?: NotificationData;
  timestamp: Date;
  isRead: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  useEffect(() => {
    initializeNotifications();
    
    return () => {
      notificationService.cleanup();
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      await notificationService.initialize();
      const token = notificationService.getExpoPushToken();
      setExpoPushToken(token);
      setIsInitialized(true);

      // Set up notification listeners (mock mode)
      console.log('Notification listeners setup (mock mode)');
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      setIsInitialized(true); // Set to true even on error to prevent infinite loading
    }
  };

  const addNotification = (notification: InAppNotification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const requestPermissions = async (): Promise<boolean> => {
    return await notificationService.requestPermissions();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isInitialized,
    expoPushToken,
    addNotification,
    removeNotification,
    markAsRead,
    clearAllNotifications,
    requestPermissions,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
