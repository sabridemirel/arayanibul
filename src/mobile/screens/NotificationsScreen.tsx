import React, { useState, useEffect } from 'react';
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
import { useNotifications } from '../contexts/NotificationContext';
import { notificationAPI, NotificationItem } from '../services/api';
import { Loading, ErrorMessage } from '../components/ui';

interface NotificationsScreenProps {
  navigation: any;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const { notifications: inAppNotifications, markAsRead, clearAllNotifications } = useNotifications();
  const [serverNotifications, setServerNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
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

  const handleNotificationPress = async (notification: NotificationItem) => {
    try {
      // Mark as read on server
      if (!notification.isRead) {
        await notificationAPI.markAsRead(notification.id);
        setServerNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        );
      }

      // Navigate based on notification type
      navigateBasedOnNotification(notification);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const navigateBasedOnNotification = (notification: NotificationItem) => {
    const data = notification.data;
    
    switch (notification.type) {
      case 'new_offer':
        if (data?.needId) {
          navigation.navigate('NeedDetail', { needId: data.needId });
        }
        break;
      case 'offer_accepted':
      case 'offer_rejected':
        navigation.navigate('MyOffers');
        break;
      case 'new_message':
        if (data?.offerId) {
          navigation.navigate('Chat', { offerId: data.offerId });
        }
        break;
      case 'need_expiring':
        navigation.navigate('MyNeeds');
        break;
      default:
        console.log('Unknown notification type:', notification.type);
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

  const handleDeleteNotification = async (notificationId: number) => {
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
              await notificationAPI.deleteNotification(notificationId);
              setServerNotifications(prev =>
                prev.filter(n => n.id !== notificationId)
              );
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

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => (
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
        onPress={() => handleDeleteNotification(item.id)}
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

  const allNotifications = [...serverNotifications];
  const hasUnreadNotifications = allNotifications.some(n => !n.isRead);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {allNotifications.length > 0 && (
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
        data={allNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={allNotifications.length === 0 ? styles.emptyContainer : undefined}
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