import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'new_offer' | 'offer_accepted' | 'offer_rejected' | 'new_message' | 'need_expiring';
  needId?: number;
  offerId?: number;
  messageId?: number;
  title?: string;
  body?: string;
}

export interface NotificationReceivedCallback {
  (notification: Notifications.Notification): void;
}

export interface NotificationResponseCallback {
  (response: Notifications.NotificationResponse): void;
}

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private isInitialized: boolean = false;
  private receivedCallbacks: NotificationReceivedCallback[] = [];
  private responseCallbacks: NotificationResponseCallback[] = [];

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
      await this.registerForPushNotificationsAsync();
      this.setupNotificationListeners();
      this.isInitialized = true;
      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  private async registerForPushNotificationsAsync(): Promise<void> {
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permissions');
        return;
      }

      // Get the Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        console.warn('No Expo project ID found. Using default push token generation.');
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      this.expoPushToken = tokenData.data;
      console.log('Expo Push Token:', this.expoPushToken);

      // Store token locally for retrieval
      await AsyncStorage.setItem('expoPushToken', this.expoPushToken);

      // Send token to backend
      await this.sendTokenToBackend(this.expoPushToken);

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        // Additional channels for different notification types
        await Notifications.setNotificationChannelAsync('offers', {
          name: 'Offers',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#007bff',
        });

        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#28a745',
        });
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      throw error;
    }
  }

  private setupNotificationListeners(): void {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        this.handleNotificationReceived(notification);
      }
    );

    // Listener for notification responses (user tapped notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        this.handleNotificationResponse(response);
      }
    );

    console.log('Notification listeners setup successfully');
  }

  private handleNotificationReceived(notification: Notifications.Notification): void {
    // Call all registered callbacks
    this.receivedCallbacks.forEach((callback) => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification received callback:', error);
      }
    });
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    // Call all registered callbacks
    this.responseCallbacks.forEach((callback) => {
      try {
        callback(response);
      } catch (error) {
        console.error('Error in notification response callback:', error);
      }
    });
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

  // Register callbacks for notification events
  onNotificationReceived(callback: NotificationReceivedCallback): () => void {
    this.receivedCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      this.receivedCallbacks = this.receivedCallbacks.filter((cb) => cb !== callback);
    };
  }

  onNotificationResponse(callback: NotificationResponseCallback): () => void {
    this.responseCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      this.responseCallbacks = this.responseCallbacks.filter((cb) => cb !== callback);
    };
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<void> {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data || {},
    };

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      console.log('Push notification sent successfully');
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput | null
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
        },
        trigger: trigger || null, // null = immediate
      });
      console.log('Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule local notification:', error);
      throw error;
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Failed to get badge count:', error);
      return 0;
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log('Badge count set to:', count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  async getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
    try {
      return await Notifications.getLastNotificationResponseAsync();
    } catch (error) {
      console.error('Failed to get last notification response:', error);
      return null;
    }
  }

  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    this.receivedCallbacks = [];
    this.responseCallbacks = [];
    console.log('Notification service cleanup completed');
  }
}

export const notificationService = NotificationService.getInstance();
