import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { notificationService, NotificationData } from '../services/notificationService';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  data?: NotificationData;
  timestamp: Date;
  isRead: boolean;
  source: 'local' | 'server';
}

interface NotificationContextType {
  notifications: InAppNotification[];
  unreadCount: number;
  isInitialized: boolean;
  expoPushToken: string | null;
  navigationHandler: ((data: NotificationData) => void) | null;
  setNavigationHandler: (handler: ((data: NotificationData) => void) | null) => void;
  addNotification: (notification: InAppNotification) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  requestPermissions: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [navigationHandler, setNavigationHandler] = useState<((data: NotificationData) => void) | null>(null);
  const appState = useRef(AppState.currentState);
  const notificationReceivedUnsubscribe = useRef<(() => void) | null>(null);
  const notificationResponseUnsubscribe = useRef<(() => void) | null>(null);

  useEffect(() => {
    initializeNotifications();

    // Setup app state listener to handle notifications when app comes to foreground
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (notificationReceivedUnsubscribe.current) {
        notificationReceivedUnsubscribe.current();
      }
      if (notificationResponseUnsubscribe.current) {
        notificationResponseUnsubscribe.current();
      }
      notificationService.cleanup();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to the foreground
      console.log('App has come to foreground');

      // Check if app was opened from a notification
      const response = await notificationService.getLastNotificationResponse();
      if (response) {
        handleNotificationResponse(response);
      }
    }
    appState.current = nextAppState;
  };

  const initializeNotifications = async () => {
    try {
      await notificationService.initialize();
      const token = notificationService.getExpoPushToken();
      setExpoPushToken(token);

      // Setup notification listeners
      setupNotificationListeners();

      setIsInitialized(true);
      console.log('Notification context initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      setIsInitialized(true); // Set to true even on error to prevent infinite loading
    }
  };

  const setupNotificationListeners = () => {
    // Listener for notifications received while app is in foreground
    notificationReceivedUnsubscribe.current = notificationService.onNotificationReceived(
      (notification: any) => {
        console.log('Notification received in context:', notification);
        handleNotificationReceived(notification);
      }
    );

    // Listener for notification responses (user tapped notification)
    notificationResponseUnsubscribe.current = notificationService.onNotificationResponse(
      (response: any) => {
        console.log('Notification response in context:', response);
        handleNotificationResponse(response);
      }
    );

    console.log('Notification listeners setup in context');
  };

  const handleNotificationReceived = (notification: any) => {
    if (!notification?.request?.content) return;

    // Add notification to local state when received in foreground
    const notificationData = notification.request.content.data as NotificationData;

    const inAppNotification: InAppNotification = {
      id: notification.request.identifier,
      title: notification.request.content.title || 'Bildirim',
      body: notification.request.content.body || '',
      data: notificationData,
      timestamp: new Date(),
      isRead: false,
      source: 'local',
    };

    addNotification(inAppNotification);

    // Update badge count
    const newUnreadCount = notifications.filter((n) => !n.isRead).length + 1;
    notificationService.setBadgeCount(newUnreadCount);
  };

  const handleNotificationResponse = (response: any) => {
    if (!response?.notification?.request?.content) return;

    // User tapped on notification - navigate to appropriate screen
    const notificationData = response.notification.request.content.data as NotificationData;

    if (notificationData && navigationHandler) {
      console.log('Navigating based on notification data:', notificationData);
      navigationHandler(notificationData);
    }

    // Mark notification as read
    const notificationId = response.notification.request.identifier;
    markAsRead(notificationId);

    // Update badge count
    const newUnreadCount = Math.max(0, notifications.filter((n) => !n.isRead).length - 1);
    notificationService.setBadgeCount(newUnreadCount);
  };

  const addNotification = (notification: InAppNotification) => {
    setNotifications((prev) => {
      // Prevent duplicates
      const exists = prev.find((n) => n.id === notification.id);
      if (exists) return prev;

      return [notification, ...prev];
    });
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    notificationService.setBadgeCount(0);
  };

  const requestPermissions = async (): Promise<boolean> => {
    return await notificationService.requestPermissions();
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isInitialized,
    expoPushToken,
    navigationHandler,
    setNavigationHandler,
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
