import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Button, Card, Loading, ErrorMessage, NotificationBadge, UserRatingDisplay } from '../components/ui';
import { colors, spacing, borderRadius, typography } from '../theme';
import { User } from '../types';

interface Props {
  navigation: any;
  route?: {
    params?: {
      userId?: string;
    };
  };
}

const ProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user: currentUser, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = route?.params?.userId;
  const isOwnProfile = !userId || userId === currentUser?.id;
  const displayUser = isOwnProfile ? currentUser : profileUser;

  useEffect(() => {
    if (!isOwnProfile && userId) {
      loadUserProfile(userId);
    }
  }, [userId, isOwnProfile]);

  const loadUserProfile = async (targetUserId: string) => {
    try {
      setLoading(true);
      setError(null);
      // TODO: Implement userAPI.getUserById when backend supports it
      // const user = await userAPI.getUserById(targetUserId);
      // setProfileUser(user);
      
      // For now, show error since this endpoint doesn't exist yet
      setError('Kullanıcı profili yüklenemedi');
    } catch (err: any) {
      setError(err.message || 'Profil yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!isOwnProfile && userId) {
      setRefreshing(true);
      await loadUserProfile(userId);
      setRefreshing(false);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              Alert.alert('Başarılı', 'Çıkış yapıldı');
            } catch (error: any) {
              Alert.alert('Hata', error.message);
            }
          },
        },
      ]
    );
  };

  const renderProfileImage = () => {
    const imageSource = displayUser?.profileImageUrl
      ? { uri: displayUser.profileImageUrl }
      : require('../assets/images/icon.png'); // Default avatar

    return (
      <View style={styles.profileImageContainer}>
        <Image source={imageSource} style={styles.profileImage} />
        {isOwnProfile && (
          <TouchableOpacity 
            style={styles.editImageButton}
            onPress={() => {
              // TODO: Implement image picker
              Alert.alert('Bilgi', 'Profil fotoğrafı değiştirme özelliği yakında eklenecek');
            }}
          >
            <MaterialIcons name="camera-alt" size={16} color={colors.surface} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderUserInfo = () => {
    if (!displayUser) return null;

    return (
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {displayUser.firstName} {displayUser.lastName}
        </Text>
        <Text style={styles.userEmail}>{displayUser.email}</Text>
        
        {displayUser.rating !== undefined && (
          <UserRatingDisplay
            rating={displayUser.rating}
            reviewCount={displayUser.reviewCount || 0}
            size="large"
            onPress={() => navigation.navigate('ReviewHistory', { userId: displayUser.id })}
            style={styles.ratingContainer}
          />
        )}

        {displayUser.isGuest && (
          <View style={styles.guestBadge}>
            <MaterialIcons name="person-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.guestText}>Misafir Kullanıcı</Text>
          </View>
        )}
      </View>
    );
  };

  const renderActions = () => {
    if (!isOwnProfile) return null;

    return (
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <View style={styles.notificationContent}>
            <MaterialIcons name="notifications" size={24} color={colors.primary} />
            <View style={styles.notificationTextContainer}>
              <Text style={styles.notificationTitle}>Bildirimler</Text>
              <Text style={styles.notificationSubtitle}>
                {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimler okundu'}
              </Text>
            </View>
            {unreadCount > 0 && (
              <NotificationBadge count={unreadCount} size="small" />
            )}
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <Button
          title="Profili Düzenle"
          onPress={handleEditProfile}
          icon="edit"
          fullWidth
          style={styles.editButton}
        />
        
        <Button
          title="Tekliflerim"
          onPress={() => navigation.navigate('MyOffers')}
          icon="local-offer"
          fullWidth
          style={styles.editButton}
        />
        
        <Button
          title="Değerlendirmelerim"
          onPress={() => navigation.navigate('ReviewHistory')}
          icon="star"
          fullWidth
          style={styles.editButton}
        />
        
        <Button
          title="Çıkış Yap"
          onPress={handleLogout}
          variant="outline"
          icon="logout"
          fullWidth
          style={styles.logoutButton}
        />
      </View>
    );
  };

  const renderStats = () => {
    // TODO: Add user statistics when backend supports it
    return (
      <Card style={styles.statsCard}>
        <Text style={styles.statsTitle}>İstatistikler</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>-</Text>
            <Text style={styles.statLabel}>İhtiyaçlar</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>-</Text>
            <Text style={styles.statLabel}>Teklifler</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>-</Text>
            <Text style={styles.statLabel}>Tamamlanan</Text>
          </View>
        </View>
      </Card>
    );
  };

  if (loading) {
    return <Loading text="Profil yükleniyor..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={() => userId && loadUserProfile(userId)}
      />
    );
  }

  if (!displayUser) {
    return (
      <ErrorMessage
        message="Kullanıcı bilgileri bulunamadı"
        showRetry={false}
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          enabled={!isOwnProfile}
        />
      }
    >
      <View style={styles.header}>
        {renderProfileImage()}
        {renderUserInfo()}
      </View>

      {renderActions()}
      {renderStats()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.border,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight as any,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ratingText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.xs,
  },
  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  guestText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  actions: {
    marginBottom: spacing.xl,
  },
  notificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  editButton: {
    marginBottom: spacing.md,
  },
  logoutButton: {
    borderColor: colors.error,
  },
  statsCard: {
    marginBottom: spacing.lg,
  },
  statsTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default ProfileScreen;