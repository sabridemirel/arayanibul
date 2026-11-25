import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { productAPI } from '../services/api';
import type { ProductPage } from '../services/api';
import { RootStackParamList } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Loading from '../components/ui/Loading';
import AuthPromptModal from '../components/ui/AuthPromptModal';
import { useAuthPrompt } from '../hooks/useAuthPrompt';
import { WEB_URL } from '../utils/webLinks';
import { colors, spacing, borderRadius } from '../theme';

type Navigation = StackNavigationProp<RootStackParamList, 'ProductPrice'>;

const tl = (value: number) => `${Math.round(value).toLocaleString('tr-TR')} TL`;
const digitsOnly = (value: string) => value.replace(/\D/g, '');
const formatDigits = (digits: string) => (digits ? Number(digits).toLocaleString('tr-TR') : '');

const apiMessage = (err: any, fallback: string): string => err?.response?.data?.message || fallback;

/**
 * "Gerçek Fiyat": one product, one number. The number is the highest price a buyer is offering for
 * the product right now. A seller accepts it with one tap; a buyer names their own price and sees
 * where that puts them.
 */
const ProductPriceScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'ProductPrice'>>();
  const { slug } = route.params;
  const {
    requireAuthForGuest,
    modalVisible,
    modalContext,
    handleLogin,
    handleRegister,
    handleDismiss,
  } = useAuthPrompt();

  const [page, setPage] = useState<ProductPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Buyer panel; it can arrive opened and pre-filled from the quick listing screen
  const [isBidOpen, setIsBidOpen] = useState(Boolean(route.params.openBid));
  const [bidPrice, setBidPrice] = useState(digitsOnly(route.params.price ?? ''));
  const [bidAddress, setBidAddress] = useState(route.params.address ?? '');
  const [isConfirmingSale, setIsConfirmingSale] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      setPage(await productAPI.getPage(slug));
    } catch (err: any) {
      setLoadError(
        err?.response?.status === 404
          ? 'Bu ürün için fiyat sayfası yok.'
          : 'Fiyat sayfası yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const realPrice = page?.realPrice ?? null;

  const submitBid = (withPrice: boolean) => {
    const price = withPrice && bidPrice ? Number(bidPrice) : undefined;
    if (withPrice && !price) {
      setActionError('Vermek istediğiniz fiyatı yazın ya da fiyatı satıcılara bırakın.');
      return;
    }

    requireAuthForGuest('create_need', async () => {
      setIsSaving(true);
      setActionError(null);
      try {
        const result = await productAPI.placeBid(slug, price, bidAddress.trim());
        setPage(result.page);
        setIsBidOpen(false);
        const mine = result.page.myListing;
        setNotice(
          !price
            ? 'İlanınız yayında. Satıcılar size kendi fiyatlarıyla teklif verecek.'
            : mine?.rank === 1
              ? `İlanınız yayında ve ${tl(price)} ile ilk sıradasınız. Elinde olan satıcı size bu fiyattan teklif verebilir.`
              : `İlanınız yayında, ${mine?.rank}. sıradasınız.${
                  mine?.priceToLead ? ` ${tl(mine.priceToLead)} verirseniz ilk sıraya geçersiniz.` : ''
                }`
        );
      } catch (err: any) {
        setActionError(apiMessage(err, 'Fiyatınız kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'));
      } finally {
        setIsSaving(false);
      }
    });
  };

  const confirmSale = async () => {
    setIsSaving(true);
    setActionError(null);
    try {
      const result = await productAPI.sell(slug);
      setIsConfirmingSale(false);
      setNotice(
        `Teklifiniz ${tl(result.price)} üzerinden alıcıya gönderildi. Alıcı ${page?.responseDays ?? 7} gün içinde yanıt verir; kabul ederse mesajlardan görüşebilirsiniz.`
      );
      await load();
    } catch (err: any) {
      setActionError(apiMessage(err, 'Teklifiniz gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'));
    } finally {
      setIsSaving(false);
    }
  };

  const share = async () => {
    if (!page) return;
    const url = `${WEB_URL}/fiyat/${page.slug}`;
    const text = realPrice
      ? `${page.name}'e ${tl(realPrice)} veren var, elinde olan dokunsun.`
      : `${page.name} arayanlar burada, elinde olan dokunsun.`;
    try {
      await Share.share({ message: `${text} ${url}` });
    } catch {
      // Sharing was dismissed; nothing to report
    }
  };

  const renderBody = () => {
    if (isLoading) {
      return <Loading text="Fiyat yükleniyor..." />;
    }

    if (!page) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>{loadError}</Text>
          <Button title="Tekrar Dene" onPress={() => { setIsLoading(true); void load(); }} style={styles.retry} />
        </View>
      );
    }

    const lastDeal = page.recentDeals[0];
    const mine = page.myListing;
    const sellTarget = page.sellTarget;
    const hasPricedBuyer = page.seekers.some((seeker) => seeker.price);

    return (
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); void load(); }}
            colors={[colors.primary]}
          />
        }
      >
        <Text style={styles.category}>{page.categoryName}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {page.name} · ikinci el
        </Text>

        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.priceCard}
        >
          <Text style={styles.priceLabel}>Gerçek fiyat</Text>
          {realPrice ? (
            <>
              <Text style={styles.price} adjustsFontSizeToFit numberOfLines={1}>
                {tl(realPrice)}
              </Text>
              <Text style={styles.priceCaption}>Şu an bu fiyata alıcısı var</Text>
            </>
          ) : (
            <>
              <Text style={styles.noPrice}>Henüz fiyat oluşmadı</Text>
              <Text style={styles.priceCaption}>İlk fiyatı siz verin</Text>
            </>
          )}
          <Text style={styles.priceMeta}>
            {page.seekerCount > 0 ? `${page.seekerCount} kişi arıyor` : 'Henüz arayan yok'}
            {lastDeal ? ` · son anlaşılan teklif ${tl(lastDeal.price)}` : ''}
          </Text>
        </LinearGradient>

        {notice ? (
          <Text style={styles.notice} accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}
        {actionError ? (
          <Text style={styles.actionError} accessibilityRole="alert">
            {actionError}
          </Text>
        ) : null}

        {mine ? (
          <Text style={styles.myListing}>
            {mine.price
              ? `Sizin fiyatınız ${tl(mine.price)}, ${mine.rank}. sıradasınız.${
                  mine.priceToLead ? ` ${tl(mine.priceToLead)} verirseniz ilk sıraya geçersiniz.` : ''
                }`
              : 'Bu ürün için fiyatsız bir ilanınız var; satıcılar kendi fiyatlarıyla teklif verebilir.'}
          </Text>
        ) : null}

        <Button
          title="Elimde Var, Bu Fiyata Satarım"
          onPress={() => {
            setNotice(null);
            setActionError(null);
            requireAuthForGuest('make_offer', () => {
              setIsBidOpen(false);
              setIsConfirmingSale(true);
            });
          }}
          disabled={!hasPricedBuyer}
          fullWidth
          style={styles.action}
        />
        <Button
          title={mine ? 'Fiyatımı Değiştir' : 'Ben de Arıyorum'}
          variant="outline"
          onPress={() => {
            setNotice(null);
            setActionError(null);
            setIsConfirmingSale(false);
            setIsBidOpen((open) => !open);
          }}
          fullWidth
          style={styles.action}
        />
        <TouchableOpacity onPress={share} style={styles.shareButton} accessibilityRole="button">
          <MaterialIcons name="share" size={20} color={colors.primary} />
          <Text style={styles.shareText}>Paylaş</Text>
        </TouchableOpacity>

        {isConfirmingSale ? (
          <View style={styles.panel}>
            {sellTarget ? (
              <>
                <Text style={styles.panelTitle}>{tl(sellTarget.price)} üzerinden teklif veriyorsunuz</Text>
                <Text style={styles.panelText}>
                  {sellTarget.isTopPrice
                    ? 'Teklifiniz en yüksek fiyatı veren alıcıya gidecek.'
                    : 'En yüksek fiyatlı ilana teklif veremediğiniz için teklifiniz sıradaki alıcıya gidecek.'}{' '}
                  Alıcı {page.responseDays} gün içinde yanıt verir. Fiyat, çalışır durumdaki temiz ürün içindir;
                  ayrıntıları mesajlarda konuşursunuz. Teklif vermek ücretsizdir.
                </Text>
                <Button title="Teklifi Gönder" onPress={confirmSale} loading={isSaving} disabled={isSaving} fullWidth style={styles.action} />
              </>
            ) : (
              <Text style={styles.panelText}>
                Fiyat veren alıcılara zaten teklif verdiniz ya da en yüksek fiyat sizin ilanınıza ait.
              </Text>
            )}
            <Button title="Vazgeç" variant="ghost" onPress={() => setIsConfirmingSale(false)} disabled={isSaving} fullWidth />
          </View>
        ) : null}

        {isBidOpen ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Bu ürüne kaç TL verirsiniz?</Text>
            <Text style={styles.panelText}>
              Fiyatınız herkese açık görünür ve sıranızı belirler. İlanınız {page.listingDays} gün yayında kalır, sonra
              tek dokunuşla yenilersiniz.
            </Text>

            {page.suggestedPrices.length > 0 ? (
              <View style={styles.chipRow}>
                {page.suggestedPrices.map((price) => {
                  const isSelected = bidPrice === String(Math.round(price));
                  return (
                    <TouchableOpacity
                      key={price}
                      onPress={() => setBidPrice(String(Math.round(price)))}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`Önerilen fiyat ${tl(price)}`}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{tl(price)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            <Input
              label="Fiyatınız (TL)"
              placeholder="Örneğin 15.000"
              keyboardType="number-pad"
              value={formatDigits(bidPrice)}
              onChangeText={(value) => setBidPrice(digitsOnly(value))}
            />
            <Input
              label="Şehir"
              placeholder="İsteğe bağlı"
              leftIcon="location-on"
              value={bidAddress}
              onChangeText={setBidAddress}
              maxLength={100}
            />

            <Button title="Fiyatımı Yayınla" onPress={() => submitBid(true)} loading={isSaving} disabled={isSaving} fullWidth />
            <TouchableOpacity
              onPress={() => submitBid(false)}
              disabled={isSaving}
              style={styles.shareButton}
              accessibilityRole="button"
            >
              <Text style={styles.shareText}>Fiyatı satıcılar söylesin</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.sectionTitle} accessibilityRole="header">
          Arayanlar
        </Text>
        {page.seekers.length === 0 ? (
          <Text style={styles.empty}>Bu ürünü arayan ilk kişi siz olun.</Text>
        ) : (
          <View style={styles.list}>
            {page.seekers.map((seeker, index) => (
              <TouchableOpacity
                key={seeker.needId}
                onPress={() => navigation.navigate('NeedDetail', { needId: seeker.needId })}
                style={[styles.row, index > 0 && styles.rowBorder]}
                accessibilityRole="button"
                accessibilityLabel={`${index + 1}. sıra, ${seeker.price ? tl(seeker.price) : 'fiyatı satıcılar söylesin'}${
                  seeker.address ? `, ${seeker.address}` : ''
                }. İlanı aç`}
              >
                <Text style={styles.rank}>{index + 1}</Text>
                <View style={styles.rowBody}>
                  <Text style={seeker.price ? styles.rowPrice : styles.rowNoPrice}>
                    {seeker.price ? tl(seeker.price) : 'Fiyatı satıcılar söylesin'}
                  </Text>
                  {seeker.address ? <Text style={styles.rowMeta}>{seeker.address}</Text> : null}
                  {seeker.awaitingBuyerResponse ? (
                    <Text style={styles.rowWaiting}>Teklif aldı, yanıt bekleniyor</Text>
                  ) : null}
                </View>
                <Text style={styles.rowLink}>{mine?.needId === seeker.needId ? 'İlanım' : 'İlanı Aç'}</Text>
                <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.disclaimer}>
          Gerçek fiyat, bir alıcının bu ürün için şu an ödemeye hazır olduğunu söylediği en yüksek tutardır; çalışır
          durumdaki temiz ürün için geçerlidir. Bağlayıcı değildir ve ödeme Arayanibul üzerinden yapılmaz. Kapora
          isteyen kişiyi bildirin.
        </Text>
      </ScrollView>
    );
  };

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
        <Text style={styles.headerTitle}>Gerçek Fiyat</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {renderBody()}
      </KeyboardAvoidingView>

      <AuthPromptModal
        visible={modalVisible}
        context={modalContext}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onDismiss={handleDismiss}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '600', color: colors.text },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  errorTitle: { fontSize: 16, color: colors.text, textAlign: 'center' },
  retry: { marginTop: spacing.md },
  category: { fontSize: 13, fontWeight: '600', color: colors.primary },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 2 },
  priceCard: { borderRadius: 16, padding: spacing.lg, marginTop: spacing.md },
  priceLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  price: { fontSize: 46, fontWeight: '900', color: '#ffffff', marginTop: 2 },
  noPrice: { fontSize: 28, fontWeight: '900', color: '#ffffff', marginTop: 2 },
  priceCaption: { fontSize: 17, fontWeight: '600', color: '#ffffff', marginTop: 4 },
  priceMeta: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: spacing.sm },
  notice: {
    marginTop: spacing.md,
    padding: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#b7dfc2',
    backgroundColor: '#eef8f1',
    fontSize: 14,
    fontWeight: '600',
    color: '#14532d',
  },
  actionError: { marginTop: spacing.md, fontSize: 14, fontWeight: '600', color: colors.error },
  myListing: {
    marginTop: spacing.md,
    padding: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: 14,
    color: colors.text,
  },
  action: { marginTop: spacing.md },
  shareButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  shareText: { fontSize: 15, fontWeight: '600', color: colors.primary, marginLeft: 6 },
  panel: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  panelTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  panelText: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: 4, marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 15, fontWeight: '600', color: colors.text },
  chipTextSelected: { color: '#ffffff' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
  empty: { fontSize: 15, color: colors.textSecondary, marginTop: spacing.sm },
  list: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rank: { width: 24, fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  rowBody: { flex: 1 },
  rowPrice: { fontSize: 16, fontWeight: '700', color: colors.text },
  rowNoPrice: { fontSize: 15, color: colors.textSecondary },
  rowMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  rowWaiting: { fontSize: 12, fontWeight: '600', color: '#8A5A00', marginTop: 2 },
  rowLink: { fontSize: 14, fontWeight: '600', color: colors.primary },
  disclaimer: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: spacing.lg },
});

export default ProductPriceScreen;
