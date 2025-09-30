import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNotifications, InAppNotification } from '../contexts/NotificationContext';
import { notificationAPI, NotificationItem } from '../services/api';
import { NotificationData } from '../services/notificationService';
import { Loading, ErrorMessage } from '../components/ui';

interface NotificationsScreenProps {
  navigation: any;
}

interface MergedNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  source: 'local' | 'server';
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const {
    notifications: inAppNotifications,
    markAsRead: markLocalAsRead,
    clearAllNotifications,
    setNavigationHandler,
  } = useNotifications();
  const [serverNotifications, setServerNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();

    // Setup navigation handler for push notifications
    setNavigationHandler(handleNavigationFromNotification);

    return () => {
      setNavigationHandler(null);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      setError(null);
      const notifications = await notificationAPI.getNotifications();
      setServerNotifications(notifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setError('Bildirimler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadNotifications();
    setIsRefreshing(false);
  };

  const handleNavigationFromNotification = (data: NotificationData) => {
    switch (data.type) {
      case 'new_offer':
        if (data.needId) {
          navigation.navigate('NeedDetail', { needId: data.needId });
        }
        break;
      case 'offer_accepted':
      case 'offer_rejected':
        navigation.navigate('MyOffers');
        break;
      case 'new_message':
        if (data.offerId) {
          navigation.navigate('Chat', { offerId: data.offerId });
        }
        break;
      case 'need_expiring':
        navigation.navigate('MyNeeds');
        break;
      default:
        console.log('Unknown notification type:', data.type);
    }
  };

  // Merge local and server notifications
  const mergedNotifications = useMemo((): MergedNotification[] => {
    const localMapped: MergedNotification[] = inAppNotifications.map((notif) => ({
      id: `local-${notif.id}`,
      title: notif.title,
      message: notif.body,
      type: notif.data?.type || 'unknown',
      data: notif.data,
      isRead: notif.isRead,
      createdAt: notif.timestamp.toISOString(),
      source: 'local' as const,
    }));

    const serverMapped: MergedNotification[] = serverNotifications.map((notif) => ({
      id: `server-${notif.id}`,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      data: notif.data,
      isRead: notif.isRead,
      createdAt: notif.createdAt,
      source: 'server' as const,
    }));

    // Combine and sort by date (newest first)
    const combined = [...localMapped, ...serverMapped];
    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return combined;
  }, [inAppNotifications, serverNotifications]);

  const handleNotificationPress = async (notification: MergedNotification) => {
    try {
      // Mark as read
      if (!notification.isRead) {
        if (notification.source === 'server') {
          const serverId = parseInt(notification.id.replace('server-', ''));
          await notificationAPI.markAsRead(serverId);
          setServerNotifications((prev) =>
            prev.map((n) => (n.id === serverId ? { ...n, isRead: true } : n))
          );
        } else {
          const localId = notification.id.replace('local-', '');
          markLocalAsRead(localId);
        }
      }

      // Navigate based on notification data
      if (notification.data) {
        handleNavigationFromNotification(notification.data as NotificationData);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setServerNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      clearAllNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      Alert.alert('Hata', 'Bildirimler okundu olarak işaretlenirken hata oluştu');
    }
  };

  const handleDeleteNotification = async (notification: MergedNotification) => {
    Alert.alert(
      'Bildirimi Sil',
      'Bu bildirimi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              if (notification.source === 'server') {
                const serverId = parseInt(notification.id.replace('server-', ''));
                await notificationAPI.deleteNotification(serverId);
                setServerNotifications((prev) => prev.filter((n) => n.id !== serverId));
              } else {
                // For local notifications, remove from context
                const localId = notification.id.replace('local-', '');
                // Note: We'd need to add removeNotification to the context hook if we want to support this
                console.log('Local notification delete not fully implemented');
              }
            } catch (error) {
              console.error('Failed to delete notification:', error);
              Alert.alert('Hata', 'Bildirim silinirken hata oluştu');
            }
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_offer':
        return 'local-offer';
      case 'offer_accepted':
        return 'check-circle';
      case 'offer_rejected':
        return 'cancel';
      case 'new_message':
        return 'message';
      case 'need_expiring':
        return 'schedule';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_offer':
        return theme.colors.primary;
      case 'offer_accepted':
        return theme.colors.success;
      case 'offer_rejected':
        return theme.colors.error;
      case 'new_message':
        return theme.colors.info;
      case 'need_expiring':
        return theme.colors.warning;
      default:
        return theme.colors.text;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Az önce';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} saat önce`;
    } else if (diffInHours < 48) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR');
    }
  };

  const renderNotificationItem = ({ item }: { item: MergedNotification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { backgroundColor: theme.colors.surface },
        !item.isRead && { backgroundColor: theme.colors.primaryLight }
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <MaterialIcons
            name={getNotificationIcon(item.type) as any}
            size={24}
            color={getNotificationColor(item.type)}
          />
          <View style={styles.notificationTextContainer}>
            <Text style={[styles.notificationTitle, { color: theme.colors.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.notificationMessage, { color: theme.colors.textSecondary }]}>
              {item.message}
            </Text>
            <Text style={[styles.notificationTime, { color: theme.colors.textSecondary }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
          {!item.isRead && (
            <View style={[styles.unreadIndicator, { backgroundColor: theme.colors.primary }]} />
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteNotification(item)}
      >
        <MaterialIcons name="delete" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="notifications-none" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
        Henüz bildiriminiz yok
      </Text>
      <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
        Yeni teklifler ve mesajlar burada görünecek
      </Text>
    </View>
  );

  if (isLoading) {
    return <Loading text="Bildirimler yükleniyor..." />;
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ErrorMessage message={error} onRetry={loadNotifications} />
      </View>
    );
  }

  const hasUnreadNotifications = mergedNotifications.some((n) => !n.isRead);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {mergedNotifications.length > 0 && (
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => navigation.navigate('NotificationSettings')}
          >
            <MaterialIcons name="settings" size={20} color={theme.colors.text} />
            <Text style={[styles.headerButtonText, { color: theme.colors.text }]}>
              Ayarlar
            </Text>
          </TouchableOpacity>
          {hasUnreadNotifications && (
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleMarkAllAsRead}
            >
              <MaterialIcons name="done-all" size={20} color="white" />
              <Text style={[styles.headerButtonText, { color: 'white' }]}>
                Tümünü Okundu İşaretle
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={mergedNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={mergedNotifications.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});

export default NotificationsScreen;