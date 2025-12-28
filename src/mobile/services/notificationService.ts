import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Notification service stub - expo-notifications removed for Expo Go compatibility
// Push notifications will be re-added when building a development/production build

export interface NotificationData {
  type: 'new_offer' | 'offer_accepted' | 'offer_rejected' | 'new_message' | 'need_expiring';
  needId?: number;
  offerId?: number;
  messageId?: number;
  title?: string;
  body?: string;
}

export interface NotificationReceivedCallback {
  (notification: any): void;
}

export interface NotificationResponseCallback {
  (response: any): void;
}

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private isInitialized: boolean = false;
  private receivedCallbacks: NotificationReceivedCallback[] = [];
  private responseCallbacks: NotificationResponseCallback[] = [];

  private constructor() {
    console.log('NotificationService: Using stub implementation (expo-notifications not available)');
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    console.log('NotificationService: Stub initialized');
    this.isInitialized = true;
  }

  onNotificationReceived(callback: NotificationReceivedCallback): () => void {
    this.receivedCallbacks.push(callback);
    return () => {
      this.receivedCallbacks = this.receivedCallbacks.filter((cb) => cb !== callback);
    };
  }

  onNotificationResponse(callback: NotificationResponseCallback): () => void {
    this.responseCallbacks.push(callback);
    return () => {
      this.responseCallbacks = this.responseCallbacks.filter((cb) => cb !== callback);
    };
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  async requestPermissions(): Promise<boolean> {
    console.log('NotificationService: requestPermissions stub called');
    return false;
  }

  async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<void> {
    console.log('NotificationService: sendPushNotification stub called', { title, body });
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: any
  ): Promise<string> {
    console.log('NotificationService: scheduleLocalNotification stub called', { title, body });
    return '';
  }

  async cancelNotification(notificationId: string): Promise<void> {
    console.log('NotificationService: cancelNotification stub called');
  }

  async cancelAllNotifications(): Promise<void> {
    console.log('NotificationService: cancelAllNotifications stub called');
  }

  async getBadgeCount(): Promise<number> {
    return 0;
  }

  async setBadgeCount(count: number): Promise<void> {
    console.log('NotificationService: setBadgeCount stub called', count);
  }

  async getLastNotificationResponse(): Promise<any | null> {
    return null;
  }

  cleanup(): void {
    this.receivedCallbacks = [];
    this.responseCallbacks = [];
    console.log('NotificationService: cleanup completed');
  }
}

export const notificationService = NotificationService.getInstance();
