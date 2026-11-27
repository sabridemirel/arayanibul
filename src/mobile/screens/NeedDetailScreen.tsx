import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
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
import NeedModerationNotice from '../components/NeedModerationNotice';
import ReportSheet from '../components/ReportSheet';
import ImageViewerModal from '../components/ImageViewerModal';
import { getNeedStatusColor, getNeedStatusText, isNeedEditable } from '../utils/needStatus';

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
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [myOffer, setMyOffer] = useState<Offer | null>(null);

  // The seller's own offer on this need: shown instead of "Teklif Ver" while it is pending/accepted
  const loadMyOffer = useCallback((ownerId?: string) => {
    if (!user || user.isGuest || user.id === ownerId) {
      setMyOffer(null);
      return;
    }
    offerAPI.getMyOfferForNeed(needId).then(setMyOffer).catch(() => setMyOffer(null));
  }, [user, needId]);

  useEffect(() => {
    loadNeedDetail();
  }, [needId]);

  // Refresh silently when coming back (e.g. after editing the need)
  const hasFocusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true;
        return;
      }
      needAPI
        .getNeedById(needId)
        .then(n => {
          setNeed(n);
          loadMyOffer(n.userId); // e.g. back from the offer form
        })
        .catch(err => console.error('İlan yenilenirken hata:', err));
    }, [needId, loadMyOffer])
  );

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
      loadMyOffer(needData.userId);
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

  // ---- "Bu fiyata hemen alırım" listings: take the price, or ask to hear about a change
  const [isSelling, setIsSelling] = useState(false);
  const [isSavingWatch, setIsSavingWatch] = useState(false);

  const sellAtPrice = async () => {
    if (!need) return;
    setIsSelling(true);
    try {
      setMyOffer(await offerAPI.createAtListedPrice(need.id));
      Alert.alert('Teklifiniz Gönderildi', 'Alıcı kabul ederse ayrıntıları mesajlaşarak netleştirirsiniz.');
    } catch (err: any) {
      Alert.alert(
        'Teklif Gönderilemedi',
        err.response?.data?.message || 'İnternet bağlantınızı kontrol edip tekrar deneyin.'
      );
    } finally {
      setIsSelling(false);
    }
  };

  const confirmSellAtPrice = () => {
    if (!need) return;
    Alert.alert(
      'Teklifi Onaylayın',
      `${(need.maxBudget ?? 0).toLocaleString('tr-TR')} TL üzerinden teklif veriyorsunuz.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Teklifi Gönder', onPress: sellAtPrice },
      ]
    );
  };

  const togglePriceWatch = async () => {
    if (!need) return;
    setIsSavingWatch(true);
    try {
      const state = need.isWatchingPrice
        ? await needAPI.unwatchPrice(need.id)
        : await needAPI.watchPrice(need.id);
      setNeed((current) => (current ? { ...current, ...state } : current));
    } catch (err: any) {
      Alert.alert('İşlem Tamamlanamadı', err.response?.data?.message || 'Tekrar deneyin.');
    } finally {
      setIsSavingWatch(false);
    }
  };

  const handleAcceptOffer = async (offerId: number) => {
    try {
      await offerAPI.acceptOffer(offerId);
      Alert.alert('Başarılı', 'Teklif kabul edildi!');
      loadOffers(); // Refresh offers
      // Accepting moves the need to "Devam Ediyor"; refresh it so the status badge updates
      needAPI.getNeedById(needId).then(setNeed).catch(() => {});
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
        return 'Normal';
      default:
        return urgency;
    }
  };

  const getStatusText = getNeedStatusText;
  const getStatusColor = getNeedStatusColor;

  const formatBudget = (minBudget?: number, maxBudget?: number, currency = 'TRY') => {
    if (!minBudget && !maxBudget) return 'Teklife açık';
    if (minBudget && maxBudget) {
      return `${minBudget.toLocaleString('tr-TR')} - ${maxBudget.toLocaleString('tr-TR')} ${currency}`;
    }
    if (minBudget) {
      return `${minBudget.toLocaleString('tr-TR')} ${currency} ve üzeri`;
    }
    if (maxBudget) {
      return `${maxBudget.toLocaleString('tr-TR')} ${currency} ve altı`;
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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Geri"
            hitSlop={12}
          >
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
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Geri"
            hitSlop={12}
          >
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
  const hasActiveOffer = !!myOffer && (myOffer.status === 'Pending' || myOffer.status === 'Accepted');
  const canCreateOffer = user && !user.isGuest && user.id !== need.userId && need.status === 'Active' && !hasActiveOffer;
  // Reporting needs a full account and is not offered on your own need
  const canReport = !!user && !user.isGuest && user.id !== need.userId;
  // Rejected needs get their edit button inside the moderation notice
  const canEdit = !!isOwner && isNeedEditable(need.status);
  const handleEditNeed = () => navigation.navigate('EditNeed', { needId: need.id });

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
        {canReport ? (
          <TouchableOpacity
            onPress={() => setReportVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Şikayet Et"
            accessibilityHint="Bu ilanı şikayet etmek için dokunun"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="outlined-flag" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} accessible={false} />
        )}
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

          {isOwner && (
            <NeedModerationNotice
              need={need}
              onEdit={canEdit ? handleEditNeed : undefined}
            />
          )}

          {need.images && need.images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.gallery}
              contentContainerStyle={styles.galleryContent}
            >
              {need.images.map((uri, index) => (
                <TouchableOpacity
                  key={uri}
                  activeOpacity={0.85}
                  onPress={() => setViewerIndex(index)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`İlan görseli ${index + 1}, büyütmek için dokunun`}
                >
                  <Image
                    source={{ uri }}
                    style={[styles.galleryImage, need.images!.length === 1 && styles.galleryImageSingle]}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <ImageViewerModal
            images={need.images ?? []}
            startIndex={viewerIndex}
            onClose={() => setViewerIndex(null)}
            label="İlan görseli"
          />

          <Text style={styles.needDescription} allowFontScaling={true}>{need.description}</Text>

          <View style={styles.needInfo}>
            <View style={styles.infoRow}>
              <MaterialIcons name="category" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                {need.category?.nameTr || 'Kategori'}
              </Text>
            </View>

            {need.isFixedPrice && need.maxBudget ? (
              <View style={styles.infoRow}>
                <MaterialIcons name="attach-money" size={20} color={colors.textSecondary} />
                <Text style={styles.infoText}>
                  <Text style={styles.fixedPriceInline}>{need.maxBudget.toLocaleString('tr-TR')} TL</Text>
                  {' '}fiyata hemen alır, pazarlık yok
                </Text>
              </View>
            ) : (need.minBudget || need.maxBudget) ? (
              <View style={styles.infoRow}>
                <MaterialIcons name="attach-money" size={20} color={colors.textSecondary} />
                <Text style={styles.infoText}>
                  {formatBudget(need.minBudget, need.maxBudget, need.currency)}
                </Text>
              </View>
            ) : null}

            {isOwner && need.isFixedPrice && need.status === 'Active' ? (
              <View style={styles.ownerPriceNote}>
                <Text style={styles.ownerPriceNoteText}>
                  Satıcılar yalnızca bu fiyata teklif verebilir.
                  {(need.priceWatchCount ?? 0) > 0
                    ? ` ${need.priceWatchCount} satıcı bu fiyatı düşük buldu; fiyat artarsa haber bekliyor.`
                    : ''}
                  {' '}Fiyatı değiştirmek ya da ilanı tekliflere açmak için ilanı düzenleyin.
                </Text>
              </View>
            ) : null}

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
      {hasActiveOffer && myOffer && (
        <View style={styles.actionContainer}>
          <View style={styles.myOfferRow}>
            <Text style={styles.myOfferTitle}>
              Teklifiniz: {myOffer.price.toLocaleString('tr-TR')} {myOffer.currency === 'TRY' ? 'TL' : myOffer.currency}
            </Text>
            <Text style={[styles.myOfferStatus, myOffer.status === 'Accepted' && styles.myOfferStatusAccepted]}>
              {myOffer.status === 'Accepted' ? 'Kabul Edildi' : 'Beklemede'}
            </Text>
          </View>
          <Text style={styles.myOfferHint}>
            {myOffer.status === 'Accepted'
              ? 'Alıcı teklifinizi kabul etti. Ayrıntıları mesajlaşarak netleştirebilirsiniz.'
              : 'Teklifiniz alıcıya iletildi. Bu arada alıcıyla mesajlaşabilirsiniz.'}
          </Text>
          <Button
            title="Mesajlaş"
            onPress={() => navigation.navigate('Chat', { offerId: myOffer.id })}
            icon="message"
            fullWidth
          />
        </View>
      )}

      {canCreateOffer && need.isFixedPrice && (
        <View style={styles.actionContainer}>
          <Text style={styles.myOfferHint}>
            Bu alıcı pazarlık yapmıyor; yalnızca {(need.maxBudget ?? 0).toLocaleString('tr-TR')} TL fiyata satan
            satıcıdan teklif alıyor.
          </Text>
          <Button
            title="Bende Var, Bu Fiyata Satarım"
            onPress={confirmSellAtPrice}
            loading={isSelling}
            disabled={isSelling}
            icon="sell"
            fullWidth
          />
          <Button
            title={need.isWatchingPrice ? 'Fiyat Takibini Kapat' : 'Fiyat Artarsa Haber Ver'}
            onPress={togglePriceWatch}
            loading={isSavingWatch}
            disabled={isSavingWatch}
            icon={need.isWatchingPrice ? 'notifications-off' : 'notifications-active'}
            variant="outline"
            fullWidth
            style={styles.watchButton}
            accessibilityHint={
              need.isWatchingPrice
                ? 'Fiyat değişikliği bildirimini kapatır'
                : 'Alıcı fiyatı artırır ya da ilanı tekliflere açarsa size bildirim gelir'
            }
          />
          {need.isWatchingPrice ? (
            <Text style={styles.watchHint}>
              Alıcı fiyatı artırır ya da ilanı tekliflere açarsa size haber vereceğiz.
            </Text>
          ) : null}
        </View>
      )}

      {canCreateOffer && !need.isFixedPrice && (
        <View style={styles.actionContainer}>
          {myOffer?.status === 'Rejected' && (
            <Text style={styles.myOfferHint}>Önceki teklifiniz reddedildi. Yeni bir teklif verebilirsiniz.</Text>
          )}
          <Button
            title="Teklif Ver"
            onPress={handleCreateOffer}
            icon="local-offer"
            fullWidth
          />
        </View>
      )}

      {user?.isGuest && need.status === 'Active' && (
        <View style={styles.actionContainer}>
          <Button
            title="Teklif Vermek İçin Üye Olun"
            onPress={() => navigation.navigate('Register')}
            icon="person-add"
            fullWidth
          />
        </View>
      )}

      {canEdit && need.status !== 'Rejected' && (
        <View style={styles.actionContainer}>
          <Button
            title="İlanı Düzenle"
            onPress={handleEditNeed}
            icon="edit"
            variant="outline"
            fullWidth
          />
        </View>
      )}

      {canReport && (
        <ReportSheet
          visible={reportVisible}
          targetType="Need"
          targetId={need.id}
          onClose={() => setReportVisible(false)}
        />
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
  gallery: {
    marginBottom: spacing.md,
    marginHorizontal: -spacing.xs,
  },
  galleryContent: {
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  galleryImage: {
    width: 220,
    height: 165,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  galleryImageSingle: {
    width: 300,
    height: 200,
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
  myOfferRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  myOfferTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  myOfferStatus: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondaryOrangeDark,
  },
  myOfferStatusAccepted: {
    color: colors.success,
  },
  myOfferHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  fixedPriceInline: { fontWeight: '700', color: colors.primary },
  ownerPriceNote: {
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  ownerPriceNoteText: { fontSize: 13, lineHeight: 19, color: colors.text },
  watchButton: { marginTop: spacing.sm },
  watchHint: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
});

export default NeedDetailScreen;