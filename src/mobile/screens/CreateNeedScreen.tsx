import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { needAPI, categoryAPI } from '../services/api';
import { Category, CreateNeedRequest, Need, RootStackParamList } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Loading from '../components/ui/Loading';
import NeedModerationNotice from '../components/NeedModerationNotice';
import ImagePickerField from '../components/ImagePickerField';
import PriceModeSelector from '../components/PriceModeSelector';
import BackButton from '../components/BackButton';
import { confirmCategory } from '../utils/confirmCategory';
import type { PickedImage } from '../utils/prepareImage';
import {
  composeDescription,
  emptyListingValues,
  URGENCY_TO_API,
} from '../components/need/listingForm';
import type { ListingFormValues, ListingUrgency } from '../components/need/listingForm';
import { colors, spacing, typography, borderRadius } from '../theme';
import { withCreateNeedAuth } from '../hoc/withAuthPrompt';
import { isNeedEditable } from '../utils/needStatus';

type ScreenNavigation = StackNavigationProp<RootStackParamList, 'CreateNeedDetailed'>;
// The same screen is registered as EditNeed ({ needId }) for editing an existing listing
type ScreenRoute = RouteProp<RootStackParamList, 'CreateNeedDetailed' | 'EditNeed'>;

interface FormErrors {
  title?: string;
  categoryId?: string;
  price?: string;
  description?: string;
}

const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, 9);
const withDots = (digits: string) => (digits ? Number(digits).toLocaleString('tr-TR') : '');

const URGENCY_OPTIONS: { value: ListingUrgency; title: string; text: string }[] = [
  { value: 'Normal', title: 'Normal', text: 'İlanınız yayın sırasına göre listelenir.' },
  { value: 'Urgent', title: 'Acil', text: '7 gün boyunca listenin en üstünde görünür. Aynı anda bir acil ilanınız olabilir.' },
];

/** End-date choices: listings stay live until closed, or for a set time */
const EXPIRY_OPTIONS: { days: number | null; label: string }[] = [
  { days: null, label: 'Süresiz' },
  { days: 7, label: '1 hafta' },
  { days: 14, label: '2 hafta' },
  { days: 30, label: '1 ay' },
  { days: 90, label: '3 ay' },
];
/** Editing: keep the current end date unless another choice is made */
const KEEP_EXPIRY = 'keep';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

const toValues = (need: Need): ListingFormValues => ({
  title: need.title ?? '',
  description: need.description ?? '',
  categoryId: need.categoryId ?? null,
  isFixedPrice: Boolean(need.isFixedPrice),
  price: need.isFixedPrice && need.maxBudget != null ? String(Math.round(need.maxBudget)) : '',
  urgency: String(need.urgency) === 'Urgent' || Number(need.urgency) === 3 ? 'Urgent' : 'Normal',
  address: need.address ?? '',
  answers: {},
});

/** Budget an older open listing was created with (open listings no longer take one). */
const legacyBudgetOf = (need: Need | null): string | null => {
  if (!need || need.isFixedPrice || (!need.minBudget && !need.maxBudget)) return null;
  const f = (n: number) => n.toLocaleString('tr-TR');
  if (need.minBudget && need.maxBudget) return `${f(need.minBudget)} – ${f(need.maxBudget)} TL`;
  return need.maxBudget ? `en fazla ${f(need.maxBudget)} TL` : `en az ${f(need.minBudget!)} TL`;
};

/**
 * The one listing form. Quick listing opens it filled from a sentence with "Ayrıntılar" folded,
 * "Ayrıntılı formu kullan" opens it empty with them shown, and editing uses it as EditNeed.
 */
const CreateNeedScreen: React.FC = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const route = useRoute<ScreenRoute>();
  const { user } = useAuth();

  const editNeedId = route.name === 'EditNeed' ? (route.params as { needId: number } | undefined)?.needId : undefined;
  const isEdit = editNeedId !== undefined;
  const createParams = !isEdit ? (route.params as RootStackParamList['CreateNeedDetailed']) : undefined;
  const prefill = createParams?.prefill;

  const [values, setValues] = useState<ListingFormValues>(prefill?.values ?? emptyListingValues());
  const [initialValues, setInitialValues] = useState<ListingFormValues | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showDetails, setShowDetails] = useState(isEdit || Boolean(createParams?.detailsOpen));
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [photos, setPhotos] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [existingNeed, setExistingNeed] = useState<Need | null>(null);
  // Editing: photos already on the listing, and the ones the owner removed
  const [keptImages, setKeptImages] = useState<{ id: number; url: string }[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
  const [expiryChoice, setExpiryChoice] = useState<number | null | typeof KEEP_EXPIRY>(isEdit ? KEEP_EXPIRY : null);
  const [needLoading, setNeedLoading] = useState(isEdit);
  const questions = prefill?.questions ?? [];
  const product = prefill?.product ?? null;

  useEffect(() => {
    categoryAPI
      .getCategories()
      .then((all) => setCategories(all.filter((category) => category.isActive)))
      .catch(() => Alert.alert('Kategoriler Yüklenemedi', 'İnternet bağlantınızı kontrol edip tekrar deneyin.'))
      .finally(() => setCategoriesLoading(false));
  }, []);

  const categorySections = useMemo(() => {
    const roots = categories
      .filter((category) => !category.parentCategoryId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return roots.map((root) => {
      const children = categories
        .filter((category) => category.parentCategoryId === root.id)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      return { title: root.nameTr || root.name, data: children.length > 0 ? children : [root] };
    });
  }, [categories]);
  const selectedCategory = categories.find((category) => category.id === values.categoryId);

  // ---- edit: load the listing
  useEffect(() => {
    if (!isEdit || !user) return;
    (async () => {
      try {
        setNeedLoading(true);
        const need = await needAPI.getNeedById(editNeedId!);
        if (need.userId !== user.id || !isNeedEditable(need.status)) {
          Alert.alert(
            'İlan Düzenlenemez',
            need.userId !== user.id ? 'Yalnızca kendi ilanlarınızı düzenleyebilirsiniz.' : 'Bu ilan artık düzenlenemez.',
            [{ text: 'Tamam', onPress: () => navigation.goBack() }],
            { cancelable: false }
          );
          return;
        }
        const loaded = toValues(need);
        setExistingNeed(need);
        setKeptImages(need.imageItems ?? []);
        setValues(loaded);
        setInitialValues(loaded);
      } catch (err: any) {
        Alert.alert(
          'İlan Yüklenemedi',
          err.response?.data?.message || 'İnternet bağlantınızı kontrol edip tekrar deneyin.',
          [{ text: 'Tamam', onPress: () => navigation.goBack() }],
          { cancelable: false }
        );
      } finally {
        setNeedLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editNeedId, user?.id]);

  // ---- leaving with unsaved content asks first (back arrow, Android back, iOS swipe)
  const savedRef = useRef(false);
  const hasUnsavedChanges = isEdit
    ? initialValues !== null &&
      (JSON.stringify(values) !== JSON.stringify(initialValues) ||
        photos.length > 0 ||
        removedImageIds.length > 0 ||
        expiryChoice !== KEEP_EXPIRY)
    : Boolean(values.title.trim() || values.description.trim() || values.categoryId || photos.length > 0);
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    return navigation.addListener('beforeRemove', (event) => {
      if (savedRef.current) return;
      event.preventDefault();
      Alert.alert(
        'Sayfadan Çıkılsın mı?',
        isEdit ? 'Değişiklikleriniz kaydedilmedi. Çıkarsanız kaybolur.' : 'İlanınız henüz yayınlanmadı. Çıkarsanız yazdıklarınız silinir.',
        [
          { text: 'Düzenlemeye Devam Et', style: 'cancel' },
          { text: 'Çık', style: 'destructive', onPress: () => navigation.dispatch(event.data.action) },
        ]
      );
    });
  }, [navigation, hasUnsavedChanges, isEdit]);

  const update = (patch: Partial<ListingFormValues>) => {
    setValues((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      (Object.keys(patch) as string[]).forEach((key) => delete next[key as keyof FormErrors]);
      if ('isFixedPrice' in patch) delete next.price;
      return next;
    });
  };

  const validate = (): boolean => {
    const found: FormErrors = {};
    const title = values.title.trim();
    if (title.length < 5) found.title = 'Başlık en az 5 karakter olmalı';
    else if (title.length > 200) found.title = 'Başlık en fazla 200 karakter olabilir';
    if (!values.categoryId) found.categoryId = 'İlanınız için bir kategori seçin';
    if (values.isFixedPrice && !(Number(values.price) > 0)) found.price = 'Hemen almak istediğiniz fiyatı yazın';
    else if (values.isFixedPrice && Number(values.price) > 100_000_000) found.price = 'Fiyat en fazla 100.000.000 TL olabilir; kontrol edin';
    if (values.description.length > 1500) found.description = 'Açıklama en fazla 1500 karakter olabilir';
    setErrors(found);
    if (found.description) setShowDetails(true);
    return Object.keys(found).length === 0;
  };

  const scrollRef = useRef<ScrollView>(null);

  const finish = (title: string, message: string, goTo: () => void) => {
    savedRef.current = true;
    Alert.alert(title, message, [{ text: isEdit ? 'Tamam' : 'İlanlarıma Git', onPress: goTo }], { cancelable: false });
  };

  const handleCreate = async () => {
    const description = composeDescription(values);
    const categoryId = await confirmCategory(values.title.trim(), description, values.categoryId!);
    if (categoryId === null) return;

    const request: CreateNeedRequest = {
      title: values.title.trim(),
      description,
      categoryId,
      urgency: URGENCY_TO_API[values.urgency] as unknown as CreateNeedRequest['urgency'],
    };
    if (values.isFixedPrice) {
      request.isFixedPrice = true;
      request.maxBudget = Number(values.price);
    }
    if (values.address.trim()) request.address = values.address.trim();
    const expiresAt = expiryDate(expiryChoice);
    if (expiresAt) request.expiresAt = expiresAt;

    const created = await needAPI.createNeed(request);
    let photoNote = '';
    if (photos.length > 0) {
      try {
        await needAPI.uploadNeedImages(created.id, photos.map((photo) => photo.uri));
      } catch {
        photoNote = ' Fotoğraflar yüklenemedi; ilanınızı düzenleyerek tekrar ekleyebilirsiniz.';
      }
    }
    const inReview = String(created.status) === 'PendingReview';
    finish(
      inReview ? 'İlanınız Alındı' : 'İlanınız Yayında',
      inReview
        ? `İlanınız alındı. Kısa bir incelemenin ardından yayınlanacak.${photoNote}`
        : `İlanınız yayında. Teklif geldiğinde size haber vereceğiz.${photoNote}`,
      () => navigation.replace('MyNeeds')
    );
  };

  // Edit: send only what changed, so detail-only edits keep a live listing live
  const handleUpdate = async () => {
    if (!editNeedId || !initialValues) return;
    const changes: Record<string, unknown> = {};
    const title = values.title.trim();
    const description = values.description.trim();
    if (title !== initialValues.title.trim()) changes.title = title;
    if (description !== initialValues.description.trim()) changes.description = description;
    if (values.categoryId !== initialValues.categoryId) changes.categoryId = values.categoryId;
    if (values.isFixedPrice !== initialValues.isFixedPrice) changes.isFixedPrice = values.isFixedPrice;
    if (values.isFixedPrice && values.price !== initialValues.price) changes.maxBudget = Number(values.price);
    if (values.address.trim() !== initialValues.address.trim()) changes.address = values.address.trim();
    if (values.urgency !== initialValues.urgency) changes.urgency = URGENCY_TO_API[values.urgency];
    const expiresAt = expiryDate(expiryChoice);
    if (expiresAt) changes.expiresAt = expiresAt;

    if (Object.keys(changes).length === 0 && photos.length === 0 && removedImageIds.length === 0) {
      Alert.alert('Değişiklik Yok', 'Kaydedilecek bir değişiklik yapmadınız.');
      return;
    }

    // Only a change to the words or the category can make them stop fitting each other
    if ('title' in changes || 'description' in changes || 'categoryId' in changes) {
      const categoryId = await confirmCategory(title, description, values.categoryId!);
      if (categoryId === null) return;
      if (categoryId !== initialValues.categoryId) changes.categoryId = categoryId;
      else delete changes.categoryId;
    }

    let updated: Need | null = null;
    if (Object.keys(changes).length > 0) {
      updated = await needAPI.updateNeed(editNeedId, changes as Partial<CreateNeedRequest>);
    }
    let photoNote = '';
    try {
      // Remove first, so the new photos fit within the limit of five
      for (const imageId of removedImageIds) {
        await needAPI.deleteNeedImage(editNeedId, imageId);
      }
      if (photos.length > 0) {
        await needAPI.uploadNeedImages(editNeedId, photos.map((photo) => photo.uri));
      }
    } catch {
      photoNote = ' Fotoğraf değişiklikleri kaydedilemedi; tekrar deneyin.';
    }
    finish(
      'İlan Güncellendi',
      updated?.status === 'PendingReview'
        ? `İlanınız güncellendi ve yeniden incelemeye gönderildi.${photoNote}`
        : `İlanınız güncellendi.${photoNote}`,
      () => navigation.goBack()
    );
  };

  const expiryDate = (choice: number | null | typeof KEEP_EXPIRY): string | null => {
    if (choice === KEEP_EXPIRY || choice === null) return null;
    const date = new Date();
    date.setDate(date.getDate() + choice);
    date.setHours(23, 59, 59, 0);
    return date.toISOString();
  };

  const handleSubmit = async () => {
    if (!validate()) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    if (!user) {
      Alert.alert('Giriş Gerekli', 'İlan vermek için giriş yapın.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) await handleUpdate();
      else await handleCreate();
    } catch (err: any) {
      Alert.alert(
        'İlan Kaydedilemedi',
        err.response?.data?.message || 'İnternet bağlantınızı kontrol edip tekrar deneyin.'
      );
    } finally {
      setSaving(false);
    }
  };

  const header = !isEdit ? (
    <View style={styles.header}>
      <BackButton />
      <Text style={styles.headerTitle} accessibilityRole="header">
        İlan Ver
      </Text>
    </View>
  ) : null;

  if ((isEdit && (needLoading || !existingNeed)) || categoriesLoading) {
    return (
      <SafeAreaView style={styles.container} edges={isEdit ? ['bottom'] : undefined}>
        {header}
        <Loading text={isEdit ? 'İlan yükleniyor...' : 'Kategoriler yükleniyor...'} />
      </SafeAreaView>
    );
  }

  const legacyBudget = legacyBudgetOf(existingNeed);
  const isRejected = existingNeed?.status === 'Rejected';
  const answeredCount = Object.keys(values.answers).length;

  return (
    <SafeAreaView style={styles.container} edges={isEdit ? ['bottom'] : undefined}>
      {header}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        // Keeps the focused field above the keyboard on iOS; the number pad has no "done" key,
        // so dragging the form puts the keyboard away.
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {isEdit && existingNeed ? <NeedModerationNotice need={existingNeed} /> : null}

        {Object.keys(errors).length > 0 ? (
          <Text style={styles.errorBanner} accessibilityRole="alert">
            Lütfen işaretli alanları düzeltin.
          </Text>
        ) : null}

        <View style={styles.card}>
          <Input
            label="Başlık"
            placeholder="Örn. Bebek arabası arıyorum"
            value={values.title}
            onChangeText={(text) => update({ title: text })}
            error={errors.title}
            maxLength={200}
          />

          <Text style={styles.fieldLabel}>Kategori</Text>
          <TouchableOpacity
            onPress={() => setShowCategoryModal(true)}
            style={[styles.selector, errors.categoryId ? styles.selectorError : null]}
            accessibilityRole="button"
            accessibilityLabel={`Kategori: ${selectedCategory?.nameTr ?? 'seçilmedi'}`}
          >
            <Text style={selectedCategory ? styles.selectorText : styles.selectorPlaceholder}>
              {selectedCategory ? selectedCategory.nameTr || selectedCategory.name : 'Kategori seçin'}
            </Text>
            <MaterialIcons name="expand-more" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          {errors.categoryId ? <Text style={styles.errorText}>{errors.categoryId}</Text> : null}

          <Text style={[styles.fieldLabel, styles.groupGap]}>İlan türü</Text>
          <PriceModeSelector isFixedPrice={values.isFixedPrice} onChange={(isFixedPrice) => update({ isFixedPrice })} />
          {values.isFixedPrice ? (
            <>
              <Input
                label="Fiyatınız (TL)"
                placeholder="Örn. 15.000"
                keyboardType="number-pad"
                value={withDots(values.price)}
                onChangeText={(text) => update({ price: digitsOnly(text) })}
                error={errors.price}
              />
              <Text style={styles.note}>
                Teklif gelmezse fiyatı sonradan artırabilir ya da ilanı tekliflere açabilirsiniz.
              </Text>
            </>
          ) : legacyBudget ? (
            <Text style={styles.note}>
              Bu ilan daha önce {legacyBudget} bütçeyle açılmış; bütçe ilanda görünmeye devam eder.
            </Text>
          ) : null}
          {product ? (
            <Text style={styles.productHint}>
              {product.realPrice
                ? `${product.name} için alıcıların şu an verdiği en yüksek fiyat ${Math.round(product.realPrice).toLocaleString('tr-TR')} TL.`
                : `${product.name} için henüz fiyat veren yok; ilk fiyatı siz verebilirsiniz.`}
              {values.isFixedPrice ? ' Fiyatınız bu ürünün fiyat sayfasında da sıralanır.' : ''}
            </Text>
          ) : null}

          <Text style={[styles.fieldLabel, styles.groupGap]}>Aciliyet</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="Aciliyet">
            {URGENCY_OPTIONS.map((option) => {
              const selected = values.urgency === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => update({ urgency: option.value })}
                  style={[styles.choice, selected && styles.choiceSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${option.title}. ${option.text}`}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={22}
                    color={selected ? colors.primary : colors.textSecondary}
                    style={styles.choiceIcon}
                  />
                  <View style={styles.flex}>
                    <Text style={styles.choiceTitle}>{option.title}</Text>
                    <Text style={styles.choiceText}>{option.text}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.groupGap}>
            <Input
              label="Konum (isteğe bağlı)"
              placeholder="Şehir, ilçe veya mahalle"
              leftIcon="location-on"
              value={values.address}
              onChangeText={(text) => update({ address: text })}
              maxLength={500}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fotoğraflar (isteğe bağlı)</Text>
          <Text style={styles.cardText}>
            Aradığınız şeyin fotoğrafı satıcıların doğru teklif vermesine yardımcı olur. En fazla 5 fotoğraf.
          </Text>
          {keptImages.length > 0 ? (
            <View style={styles.keptRow}>
              {keptImages.map((image, index) => (
                <View key={image.id} style={styles.keptTile}>
                  <Image source={{ uri: image.url }} style={styles.keptThumb} accessibilityLabel={`İlandaki ${index + 1}. fotoğraf`} />
                  <TouchableOpacity
                    style={styles.keptRemove}
                    onPress={() => {
                      setKeptImages((current) => current.filter((item) => item.id !== image.id));
                      setRemovedImageIds((current) => [...current, image.id]);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`İlandaki ${index + 1}. fotoğrafı kaldır`}
                    hitSlop={8}
                  >
                    <MaterialIcons name="close" size={16} color={colors.surface} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
          <ImagePickerField images={photos} onChange={setPhotos} max={Math.max(0, 5 - keptImages.length)} />
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => setShowDetails((open) => !open)}
            style={styles.detailsToggle}
            accessibilityRole="button"
            accessibilityState={{ expanded: showDetails }}
          >
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Ayrıntılar (isteğe bağlı)</Text>
              <Text style={styles.cardTextTight}>
                Açıklama{questions.length > 0 ? ', ürün bilgileri' : ''} ve bitiş tarihi
                {answeredCount > 0 ? ` · ${answeredCount} bilgi seçili` : ''}
              </Text>
            </View>
            <MaterialIcons name={showDetails ? 'expand-less' : 'expand-more'} size={26} color={colors.textSecondary} />
          </TouchableOpacity>

          {showDetails ? (
            <View style={styles.detailsBody}>
              {questions.map((question) => (
                <View key={question.label} style={styles.questionBlock}>
                  <Text style={styles.fieldLabel}>{question.label}</Text>
                  <View style={styles.optionRow}>
                    {question.options.map((option) => {
                      const selected = values.answers[question.label] === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          onPress={() => {
                            const answers = { ...values.answers };
                            if (selected) delete answers[question.label];
                            else answers[question.label] = option;
                            update({ answers });
                          }}
                          style={[styles.option, selected && styles.optionSelected]}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={`${question.label}: ${option}`}
                        >
                          <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
              <Input
                label="Açıklama"
                placeholder="Aradığınızı biraz daha anlatın: model, ölçü, teslimat tercihi…"
                value={values.description}
                onChangeText={(text) => update({ description: text })}
                error={errors.description}
                multiline
                numberOfLines={4}
                maxLength={1500}
              />

              <Text style={styles.fieldLabel}>Bitiş tarihi</Text>
              {isEdit ? (
                <Text style={styles.note}>
                  {existingNeed?.expiresAt
                    ? `Şu an ${formatDate(existingNeed.expiresAt)} tarihinde bitiyor.`
                    : 'Şu an süresiz; siz kapatana kadar yayında kalır.'}
                </Text>
              ) : null}
              <View style={styles.optionRow} accessibilityRole="radiogroup" accessibilityLabel="Bitiş tarihi">
                {(isEdit
                  ? [{ days: KEEP_EXPIRY as typeof KEEP_EXPIRY, label: 'Değiştirme' }, ...EXPIRY_OPTIONS.filter((o) => o.days !== null)]
                  : EXPIRY_OPTIONS
                ).map((option) => {
                  const selected = expiryChoice === option.days;
                  return (
                    <TouchableOpacity
                      key={option.label}
                      onPress={() => setExpiryChoice(option.days)}
                      style={[styles.option, selected && styles.optionSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`Bitiş: ${option.label}`}
                    >
                      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        {!isEdit ? (
          <View style={styles.notice}>
            <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.noticeText}>Uygun ilanlar hemen yayınlanır; bazı ilanlar kısa bir incelemeden geçebilir.</Text>
          </View>
        ) : existingNeed?.status === 'Active' ? (
          <View style={styles.notice}>
            <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.noticeText}>Başlık, açıklama veya kategori değişikliği ilanınızı yeniden incelemeye gönderir.</Text>
          </View>
        ) : null}

        <Button
          title={isEdit ? (isRejected ? 'Düzenle ve Tekrar Gönder' : 'Değişiklikleri Kaydet') : 'İlanı Yayınla'}
          onPress={handleSubmit}
          loading={saving}
          disabled={saving}
          fullWidth
          icon={isEdit ? (isRejected ? 'send' : 'save') : 'check'}
          style={styles.submit}
        />
      </ScrollView>

      <Modal visible={showCategoryModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setShowCategoryModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              hitSlop={12}
              style={styles.modalClose}
            >
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Kategori Seçin</Text>
          </View>
          <SectionList
            sections={categorySections}
            keyExtractor={(item) => item.id.toString()}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
            renderItem={({ item }) => {
              const selected = item.id === values.categoryId;
              return (
                <TouchableOpacity
                  onPress={() => {
                    update({ categoryId: item.id });
                    setShowCategoryModal(false);
                  }}
                  style={styles.categoryRow}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.categoryName, selected && styles.categoryNameSelected]}>{item.nameTr || item.name}</Text>
                  {selected ? <MaterialIcons name="check" size={22} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.categoryList}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: typography.h3.fontSize, fontWeight: '600', color: colors.text },
  modalClose: { marginRight: spacing.md },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  errorBanner: {
    backgroundColor: '#fdecee',
    color: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardText: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.md },
  cardTextTight: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: spacing.xs },
  groupGap: { marginTop: spacing.md },
  selector: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  selectorError: { borderColor: colors.error },
  selectorText: { fontSize: 16, color: colors.text },
  selectorPlaceholder: { fontSize: 16, color: colors.textSecondary },
  errorText: { fontSize: 12, color: colors.error, marginTop: spacing.xs },
  note: { fontSize: 13, lineHeight: 18, color: colors.textSecondary, marginTop: -spacing.xs, marginBottom: spacing.sm },
  productHint: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 48,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  choiceIcon: { marginTop: 1, marginRight: spacing.sm },
  choiceTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  choiceText: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  keptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  keptTile: { width: 96, height: 96, borderRadius: 12, overflow: 'hidden' },
  keptThumb: { width: '100%', height: '100%', backgroundColor: colors.background },
  keptRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsToggle: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  detailsBody: { marginTop: spacing.md },
  questionBlock: { marginBottom: spacing.md },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap' },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  optionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionText: { fontSize: 15, fontWeight: '600', color: colors.text },
  optionTextSelected: { color: '#ffffff' },
  notice: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  noticeText: { fontSize: 13, color: colors.textSecondary, marginLeft: spacing.xs, flex: 1 },
  submit: { marginBottom: spacing.lg },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  categoryList: { paddingBottom: spacing.xl },
  categoryRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryName: { fontSize: 16, color: colors.text },
  categoryNameSelected: { color: colors.primary, fontWeight: '700' },
});

export default withCreateNeedAuth(CreateNeedScreen);
