import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../theme/fonts';
import { useBrandStatusBar } from '../hooks/useBrandStatusBar';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Button, Card, Loading, ErrorMessage, NotificationBadge, UserRatingDisplay } from '../components/ui';
import { colors, spacing } from '../theme';
import { User } from '../types';
import { withProfileAuth } from '../hoc/withAuthPrompt';
import { userAPI, UserStats } from '../services/api';
import { openWebPage, WebPage } from '../utils/webLinks';

const LEGAL_LINKS: { page: WebPage; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { page: 'privacy', label: 'Gizlilik Politikası', icon: 'privacy-tip' },
  { page: 'terms', label: 'Kullanım Koşulları', icon: 'description' },
  { page: 'kvkk', label: 'KVKK Aydınlatma Metni', icon: 'policy' },
  { page: 'contact', label: 'İletişim', icon: 'mail-outline' },
];

interface Props {
  navigation: any;
  route?: {
    params?: {
      userId?: string;
    };
  };
}

const ProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user: currentUser, logout, deleteAccount } = useAuth();
  const [deletingAccount, setDeletingAccount] = useState(false);
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  useBrandStatusBar();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const userId = route?.params?.userId;
  const isOwnProfile = !userId || userId === currentUser?.id;
  const displayUser = isOwnProfile ? currentUser : profileUser;

  useEffect(() => {
    if (!isOwnProfile && userId) {
      loadUserProfile(userId);
    }
  }, [userId, isOwnProfile]);

  useEffect(() => {
    if (isOwnProfile && currentUser) {
      loadUserStats();
    }
  }, [isOwnProfile, currentUser]);

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

  const loadUserStats = async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      const statsData = await userAPI.getUserStats();
      setStats(statsData);
    } catch (err: any) {
      setStatsError(err.response?.data?.message || 'İstatistikler yüklenirken hata oluştu');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (!isOwnProfile && userId) {
      await loadUserProfile(userId);
    } else if (isOwnProfile) {
      await loadUserStats();
    }
    setRefreshing(false);
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Navigation will automatically redirect to auth screen
    } catch (error: any) {
      console.error('Logout error:', error.message);
      // Silently fail - user can try again
    }
  };

  const performDeleteAccount = async () => {
    try {
      setDeletingAccount(true);
      await deleteAccount();
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      Alert.alert('Hesabınız silindi.', 'Arayanibul\'u kullandığınız için teşekkür ederiz.');
    } catch (err: any) {
      const serverMessage = err?.response?.data?.message;
      Alert.alert(
        'Hesap silinemedi',
        typeof serverMessage === 'string' && serverMessage
          ? serverMessage
          : 'İnternet bağlantınızı kontrol edip tekrar deneyin.'
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabınızı silmek istiyor musunuz?',
      'Hesabınız ve kişisel bilgileriniz kalıcı olarak silinir. Aktif ilanlarınız kapatılır, bekleyen teklifleriniz geri çekilir. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Hesabımı Sil', style: 'destructive', onPress: performDeleteAccount },
      ]
    );
  };

  const initials = `${displayUser?.firstName?.[0] ?? ''}${displayUser?.lastName?.[0] ?? ''}`.toLocaleUpperCase('tr-TR') || '?';

  const renderAvatar = () => (
    <View style={styles.avatar}>
      {displayUser?.profileImageUrl ? (
        <Image source={{ uri: displayUser.profileImageUrl }} style={styles.avatarImage} />
      ) : (
        <Text style={styles.avatarInitials} accessible={false}>{initials}</Text>
      )}
    </View>
  );

  const renderStat = (value: number | undefined, label: string, route: string) => (
    <TouchableOpacity
      style={styles.stat}
      onPress={() => navigation.navigate(route)}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value ?? 0} adet`}
    >
      <Text style={styles.statNumber}>{statsLoading || statsError ? '–' : value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const renderHero = () => {
    if (!displayUser) return null;
    return (
      <LinearGradient colors={colors.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + spacing.xs }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          accessibilityRole="button"
          accessibilityLabel="Geri git"
        >
          <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.heroBody}>
          {renderAvatar()}
          <Text style={styles.userName} accessibilityRole="header">
            {displayUser.firstName} {displayUser.lastName}
          </Text>
          {isOwnProfile && displayUser.email ? <Text style={styles.userEmail}>{displayUser.email}</Text> : null}
          {displayUser.rating !== undefined && displayUser.rating > 0 && (
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
              <MaterialIcons name="person-outline" size={16} color="#ffffff" />
              <Text style={styles.guestText}>Misafir Kullanıcı</Text>
            </View>
          )}
        </View>
        {isOwnProfile && !displayUser.isGuest && (
          <View style={styles.statsRow}>
            {renderStat(stats?.needsCount, 'İlanlarım', 'MyNeeds')}
            <View style={styles.statDivider} />
            {renderStat(stats?.offersGivenCount, 'Tekliflerim', 'MyOffers')}
          </View>
        )}
      </LinearGradient>
    );
  };

  const renderMenuRow = (
    icon: keyof typeof MaterialIcons.glyphMap,
    label: string,
    onPress: () => void,
    options: { subtitle?: string; badge?: number; last?: boolean } = {}
  ) => (
    <TouchableOpacity
      key={label}
      style={[styles.menuRow, !options.last && styles.menuRowDivider]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={options.subtitle ? `${label}, ${options.subtitle}` : label}
    >
      <View style={styles.menuIcon}>
        <MaterialIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.menuText}>
        <Text style={styles.menuLabel}>{label}</Text>
        {options.subtitle ? <Text style={styles.menuSubtitle}>{options.subtitle}</Text> : null}
      </View>
      {options.badge ? <NotificationBadge count={options.badge} size="small" /> : null}
      <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderMenu = () => {
    if (!isOwnProfile) return null;
    const isGuest = !!displayUser?.isGuest;
    const rows = [
      renderMenuRow('notifications-none', 'Bildirimler', () => navigation.navigate('Notifications'), {
        subtitle: unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Tüm bildirimler okundu',
        badge: unreadCount,
      }),
      renderMenuRow('edit', 'Profili Düzenle', handleEditProfile),
      ...(!isGuest
        ? [
            renderMenuRow('campaign', 'Yeni İlan Bildirimleri', () => navigation.navigate('CategoryFollows'), {
              subtitle: 'Sattığınız kategorilerde yeni ilanlardan haberdar olun',
            }),
            renderMenuRow('list-alt', 'İlanlarım', () => navigation.navigate('MyNeeds')),
            renderMenuRow('local-offer', 'Tekliflerim', () => navigation.navigate('MyOffers')),
            renderMenuRow('star-border', 'Değerlendirmelerim', () => navigation.navigate('ReviewHistory')),
            renderMenuRow('block', 'Engellenen Kullanıcılar', () => navigation.navigate('BlockedUsers'), { last: true }),
          ]
        : []),
    ];
    return (
      <>
        <Text style={styles.sectionTitle}>Hesabım</Text>
        <Card style={styles.menuCard}>{rows}</Card>
      </>
    );
  };

  const renderLegalAndAccount = () => {
    if (!isOwnProfile) return null;

    return (
      <View>
        <Text style={styles.sectionTitle}>Yasal Bilgiler ve Destek</Text>
        <Card style={styles.menuCard}>
          {LEGAL_LINKS.map(({ page, label, icon }, index) => (
            <TouchableOpacity
              key={page}
              style={[styles.menuRow, index < LEGAL_LINKS.length - 1 && styles.menuRowDivider]}
              onPress={() => openWebPage(page)}
              accessibilityRole="link"
            >
              <View style={styles.menuIcon}>
                <MaterialIcons name={icon} size={20} color={colors.primary} />
              </View>
              <Text style={[styles.menuLabel, styles.menuText]}>{label}</Text>
              <MaterialIcons name="open-in-new" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </Card>

        <Button
          title="Çıkış Yap"
          onPress={handleLogout}
          variant="outline"
          icon="logout"
          fullWidth
          style={styles.logoutButton}
        />

        {!displayUser?.isGuest && (
          <TouchableOpacity
            style={styles.deleteAccount}
            onPress={handleDeleteAccount}
            disabled={deletingAccount}
            accessibilityRole="button"
            accessibilityHint="Hesabınızı kalıcı olarak silmek için onay ister"
          >
            <MaterialIcons name="delete-forever" size={18} color={colors.error} />
            <Text style={styles.deleteAccountText}>{deletingAccount ? 'Hesap siliniyor...' : 'Hesabımı Sil'}</Text>
          </TouchableOpacity>
        )}
      </View>
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

  function handleBackPress() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffffff" colors={[colors.primary]} />
        }
      >
        {renderHero()}
        <View style={styles.body}>
          {renderMenu()}
          {renderLegalAndAccount()}
        </View>
      </ScrollView>
      {/* Keeps the light status bar icons readable once the purple band scrolls away */}
      <View style={[styles.statusBarScrim, { height: insets.top }]} pointerEvents="none" />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  statusBarScrim: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.primaryGradient[0] },
  content: { paddingBottom: spacing.xl },
  hero: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  heroBody: { alignItems: 'center', marginTop: -spacing.sm },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: colors.secondaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitials: { fontFamily: fonts.display, fontSize: 34, color: colors.primary },
  userName: { fontFamily: fonts.display, fontSize: 24, color: '#ffffff', textAlign: 'center' },
  userEmail: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  ratingContainer: { marginTop: spacing.sm },
  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  guestText: { fontSize: 13, color: '#ffffff' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    paddingVertical: spacing.sm,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.25)' },
  statNumber: { fontFamily: fonts.display, fontSize: 24, color: '#ffffff' },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  body: { paddingHorizontal: spacing.md, paddingTop: spacing.lg },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuCard: { padding: 0, marginBottom: spacing.lg, overflow: 'hidden' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 56,
  },
  menuRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 16, color: colors.text },
  menuSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  logoutButton: { marginBottom: spacing.md },
  deleteAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  deleteAccountText: { fontSize: 15, color: colors.error, fontWeight: '600' },
});

export default withProfileAuth(ProfileScreen);
