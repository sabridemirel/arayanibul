// import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device';
// import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// Configure notification behavior - disabled for now
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: false,
//   }),
// });

export interface NotificationData {
  type: 'new_offer' | 'offer_accepted' | 'offer_rejected' | 'new_message' | 'need_expiring';
  needId?: number;
  offerId?: number;
  messageId?: number;
  title: string;
  body: string;
}

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private notificationListener: any;
  private responseListener: any;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Mock initialization for now
      console.log('Notification service initialized (mock mode)');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  private async registerForPushNotificationsAsync(): Promise<void> {
    // Mock implementation
    console.log('Push notifications registration (mock mode)');
  }

  private setupNotificationListeners(): void {
    // Mock implementation
    console.log('Notification listeners setup (mock mode)');
  }

  private handleNotificationReceived(notification: any): void {
    // Mock implementation
    console.log('Notification received (mock mode):', notification);
  }

  private handleNotificationResponse(response: any): void {
    // Mock implementation
    console.log('Notification response (mock mode):', response);
  }

  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      const platform = Platform.OS;
      await api.post('/notification/device-token', { token, platform });
      console.log('Push token sent to backend successfully');
    } catch (error) {
      console.error('Failed to send push token to backend:', error);
    }
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  async requestPermissions(): Promise<boolean> {
    // Mock implementation
    console.log('Notification permissions requested (mock mode)');
    return true;
  }

  async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<void> {
    // Mock implementation
    console.log('Push notification sent (mock mode):', { title, body, data });
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: any
  ): Promise<string> {
    // Mock implementation
    console.log('Local notification scheduled (mock mode):', { title, body, data });
    return 'mock-notification-id';
  }

  async cancelNotification(notificationId: string): Promise<void> {
    // Mock implementation
    console.log('Notification cancelled (mock mode):', notificationId);
  }

  async cancelAllNotifications(): Promise<void> {
    // Mock implementation
    console.log('All notifications cancelled (mock mode)');
  }

  async getBadgeCount(): Promise<number> {
    // Mock implementation
    return 0;
  }

  async setBadgeCount(count: number): Promise<void> {
    // Mock implementation
    console.log('Badge count set (mock mode):', count);
  }

  cleanup(): void {
    // Mock implementation
    console.log('Notification service cleanup (mock mode)');
  }
}

export const notificationService = NotificationService.getInstance();
