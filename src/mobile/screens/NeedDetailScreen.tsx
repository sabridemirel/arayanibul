import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { needAPI, offerAPI } from '../services/api';
import { Need, Offer } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import ErrorMessage from '../components/ui/ErrorMessage';
import OfferListScreen from '../components/OfferListScreen';
import { colors, spacing, typography } from '../theme';
import { RootStackParamList } from '../types';

type NeedDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'NeedDetail'>;
type NeedDetailScreenRouteProp = RouteProp<RootStackParamList, 'NeedDetail'>;

const { width: screenWidth } = Dimensions.get('window');

const NeedDetailScreen: React.FC = () => {
  const navigation = useNavigation<NeedDetailScreenNavigationProp>();
  const route = useRoute<NeedDetailScreenRouteProp>();
  const { user } = useAuth();
  const { needId } = route.params;

  const [need, setNeed] = useState<Need | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [offersLoading, setOffersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNeedDetail();
  }, [needId]);

  const loadNeedDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const needData = await needAPI.getNeedById(needId);
      setNeed(needData);

      // Load offers if user is the need owner
      if (user && needData.userId === user.id) {
        loadOffers();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'İhtiyaç detayları yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadOffers = async () => {
    try {
      setOffersLoading(true);
      const offersData = await offerAPI.getOffersForNeed(needId);
      setOffers(offersData);
    } catch (err) {
      console.error('Teklifler yüklenirken hata:', err);
    } finally {
      setOffersLoading(false);
    }
  };

  const handleCreateOffer = () => {
    if (!user) {
      Alert.alert(
        'Giriş Gerekli',
        'Teklif vermek için giriş yapmanız gerekiyor.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    if (user.isGuest) {
      Alert.alert(
        'Hesap Gerekli',
        'Teklif vermek için tam hesap oluşturmanız gerekiyor.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    if (need && user.id === need.userId) {
      Alert.alert(
        'Hata',
        'Kendi ihtiyacınıza teklif veremezsiniz.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    // Navigate to create offer screen
    navigation.navigate('CreateOffer', { needId });
  };

  const handleAcceptOffer = async (offerId: number) => {
    try {
      await offerAPI.acceptOffer(offerId);
      Alert.alert('Başarılı', 'Teklif kabul edildi!');
      loadOffers(); // Refresh offers
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.message || 'Teklif kabul edilirken hata oluştu');
    }
  };

  const handleRejectOffer = async (offerId: number) => {
    try {
      await offerAPI.rejectOffer(offerId);
      Alert.alert('Başarılı', 'Teklif reddedildi!');
      loadOffers(); // Refresh offers
    } catch (err: any) {
      Alert.alert('Hata', err.response?.data?.message || 'Teklif reddedilirken hata oluştu');
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'Urgent':
        return colors.urgent;
      case 'Normal':
        return colors.normal;
      case 'Flexible':
        return colors.flexible;
      default:
        return colors.textSecondary;
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'Urgent':
        return 'Acil';
      case 'Normal':
        return 'Normal';
      case 'Flexible':
        return 'Esnek';
      default:
        return urgency;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Active':
        return 'Aktif';
      case 'InProgress':
        return 'Devam Ediyor';
      case 'Completed':
        return 'Tamamlandı';
      case 'Cancelled':
        return 'İptal Edildi';
      case 'Expired':
        return 'Süresi Doldu';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return colors.success;
      case 'InProgress':
        return colors.warning;
      case 'Completed':
        return colors.primary;
      case 'Cancelled':
      case 'Expired':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const formatBudget = (minBudget?: number, maxBudget?: number, currency = 'TRY') => {
    if (!minBudget && !maxBudget) return 'Bütçe belirtilmemiş';
    if (minBudget && maxBudget) {
      return `${minBudget.toLocaleString()} - ${maxBudget.toLocaleString()} ${currency}`;
    }
    if (minBudget) {
      return `${minBudget.toLocaleString()} ${currency} ve üzeri`;
    }
    if (maxBudget) {
      return `${maxBudget.toLocaleString()} ${currency} ve altı`;
    }
    return '';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };



  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İhtiyaç Detayı</Text>
          <View style={{ width: 24 }} />
        </View>
        <Loading text="İhtiyaç detayları yükleniyor..." />
      </SafeAreaView>
    );
  }

  if (error || !need) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İhtiyaç Detayı</Text>
          <View style={{ width: 24 }} />
        </View>
        <ErrorMessage 
          message={error || 'İhtiyaç bulunamadı'} 
          onRetry={loadNeedDetail} 
          showRetry 
        />
      </SafeAreaView>
    );
  }

  const isOwner = user && user.id === need.userId;
  const canCreateOffer = user && !user.isGuest && user.id !== need.userId && need.status === 'Active';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Geri"
          accessibilityHint="Önceki sayfaya dönmek için dokunun"
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} allowFontScaling={true}>İhtiyaç Detayı</Text>
        <View style={{ width: 24 }} accessible={false} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.needCard}>
          <View style={styles.needHeader}>
            <Text style={styles.needTitle} allowFontScaling={true}>{need.title}</Text>
            <View style={styles.badgeContainer} accessible={false}>
              <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(need.urgency) }]} accessible={false}>
                <Text style={styles.urgencyText} allowFontScaling={true} accessible={false}>
                  {getUrgencyText(need.urgency)}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(need.status) }]} accessible={false}>
                <Text style={styles.statusText} allowFontScaling={true} accessible={false}>
                  {getStatusText(need.status)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.needDescription} allowFontScaling={true}>{need.description}</Text>

          <View style={styles.needInfo}>
            <View style={styles.infoRow}>
              <MaterialIcons name="category" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                {need.category?.nameTr || 'Kategori'}
              </Text>
            </View>

            {(need.minBudget || need.maxBudget) && (
              <View style={styles.infoRow}>
                <MaterialIcons name="attach-money" size={20} color={colors.textSecondary} />
                <Text style={styles.infoText}>
                  {formatBudget(need.minBudget, need.maxBudget, need.currency)}
                </Text>
              </View>
            )}

            {need.address && (
              <View style={styles.infoRow}>
                <MaterialIcons name="location-on" size={20} color={colors.textSecondary} />
                <Text style={styles.infoText}>{need.address}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <MaterialIcons name="schedule" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                {formatDate(need.createdAt)} tarihinde oluşturuldu
              </Text>
            </View>

            {need.expiresAt && (
              <View style={styles.infoRow}>
                <MaterialIcons name="event" size={20} color={colors.textSecondary} />
                <Text style={styles.infoText}>
                  {formatDate(need.expiresAt)} tarihinde sona eriyor
                </Text>
              </View>
            )}
          </View>

          <View style={styles.userSection}>
            <MaterialIcons name="person" size={24} color={colors.primary} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {need.user?.firstName} {need.user?.lastName}
              </Text>
              {need.user?.rating && (
                <View style={styles.userRating}>
                  <MaterialIcons name="star" size={16} color={colors.warning} />
                  <Text style={styles.ratingText}>
                    {need.user.rating.toFixed(1)} ({need.user.reviewCount} değerlendirme)
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Offers Section */}
        {isOwner && (
          <View style={styles.offersSection}>
            <OfferListScreen
              offers={offers}
              loading={offersLoading}
              onAcceptOffer={handleAcceptOffer}
              onRejectOffer={handleRejectOffer}
              onRefresh={loadOffers}
              isOwner={isOwner}
            />
          </View>
        )}
      </ScrollView>

      {/* Action Button */}
      {canCreateOffer && (
        <View style={styles.actionContainer}>
          <Button
            title="Teklif Ver"
            onPress={handleCreateOffer}
            icon="local-offer"
            fullWidth
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  needCard: {
    marginBottom: spacing.lg,
  },
  needHeader: {
    marginBottom: spacing.lg,
  },
  needTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight as any,
    color: colors.text,
    marginBottom: spacing.md,
    lineHeight: 28,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  urgencyBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.surface,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.surface,
  },
  needDescription: {
    fontSize: typography.body.fontSize,
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  needInfo: {
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    marginLeft: spacing.md,
    flex: 1,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  offersSection: {
    marginBottom: spacing.xl,
  },
  actionContainer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default NeedDetailScreen;