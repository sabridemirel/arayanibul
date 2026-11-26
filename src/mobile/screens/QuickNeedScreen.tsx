import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  SectionList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import PriceModeSelector from '../components/PriceModeSelector';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { needAPI, categoryAPI } from '../services/api';
import type { NeedDraftQuestion } from '../services/api';
import { Category, CreateNeedRequest, RootStackParamList } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { colors, spacing, typography, borderRadius } from '../theme';
import { withCreateNeedAuth } from '../hoc/withAuthPrompt';

type Navigation = StackNavigationProp<RootStackParamList, 'CreateNeed'>;

const EXAMPLES = [
  'İkinci el RTX 3080, 15 bin TL’ye kadar, İstanbul',
  'Cybex oto koltuğu, temiz kullanılmış, Ankara',
  '4 kişilik kamp çadırı, 5.000 TL’ye kadar',
];

const MIN_TEXT_LENGTH = 3;
// Backend enum value (UrgencyLevel.Normal)
const URGENCY_NORMAL = 2;

interface Draft {
  text: string;
  title: string;
  description: string;
  categoryId: number | null;
  minBudget: string;
  maxBudget: string;
  /** "Bu fiyata hemen alırım": maxBudget is the exact price */
  isFixedPrice: boolean;
  address: string;
  answers: Record<string, string>;
  questions: NeedDraftQuestion[];
}

const digitsOnly = (value: string) => value.replace(/\D/g, '');
const formatAmount = (digits: string) => (digits ? Number(digits).toLocaleString('tr-TR') : '');

const budgetText = (draft: Draft): string => {
  if (draft.isFixedPrice) {
    return draft.maxBudget ? `Hemen alır: ${formatAmount(draft.maxBudget)} TL` : 'Fiyat yazılmadı';
  }
  if (draft.minBudget && draft.maxBudget) {
    return `${formatAmount(draft.minBudget)} – ${formatAmount(draft.maxBudget)} TL`;
  }
  if (draft.maxBudget) return `En fazla ${formatAmount(draft.maxBudget)} TL`;
  if (draft.minBudget) return `En az ${formatAmount(draft.minBudget)} TL`;
  return 'Bütçe belirtilmemiş';
};

/** Listing text plus the one-tap answers, one per line ("Durum: İkinci el"). */
const describe = (draft: Draft): string =>
  [draft.description.trim(), ...Object.entries(draft.answers).map(([label, answer]) => `${label}: ${answer}`)]
    .filter(Boolean)
    .join('\n');

/**
 * Posting a listing in two short steps: write one sentence, then confirm what was understood from
 * it (category, budget, location) and publish. The long form stays one tap away for photos,
 * urgency and longer descriptions.
 */
const QuickNeedScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateNeed'>>();

  const [text, setText] = useState(route.params?.initialText ?? '');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showMinBudget, setShowMinBudget] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    categoryAPI
      .getCategories()
      .then((all) => setCategories(all.filter((category) => category.isActive)))
      .catch(() => {
        // The category picker stays empty; reading the text still suggests a category.
      });
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

  const selectedCategory = categories.find((category) => category.id === draft?.categoryId);

  // Set right before leaving after a successful publish, so the leave prompt stays quiet
  const leavingRef = useRef(false);
  const hasContent = Boolean(draft) || text.trim().length > 0;

  // Leaving with typed content (header arrow, Android back button, iOS swipe) asks first
  useEffect(() => {
    if (!hasContent) return;

    return navigation.addListener('beforeRemove', (event) => {
      if (leavingRef.current) return;
      event.preventDefault();
      Alert.alert('Sayfadan Çıkılsın mı?', 'İlanınız henüz yayınlanmadı. Çıkarsanız yazdıklarınız silinir.', [
        { text: 'Düzenlemeye Devam Et', style: 'cancel' },
        { text: 'Çık', style: 'destructive', onPress: () => navigation.dispatch(event.data.action) },
      ]);
    });
  }, [navigation, hasContent]);

  const readText = async () => {
    const trimmed = text.trim();
    if (trimmed.length < MIN_TEXT_LENGTH) {
      setError('Ne aradığınızı birkaç kelimeyle yazın.');
      return;
    }

    setError(null);
    setIsReading(true);
    try {
      const suggestion = await needAPI.buildDraft(trimmed);

      // A catalogued product has its own price page: the buyer names a price there and sees
      // where it puts them, instead of posting an ordinary listing.
      if (suggestion.productSlug) {
        leavingRef.current = true;
        navigation.replace('ProductPrice', {
          slug: suggestion.productSlug,
          openBid: true,
          price: suggestion.maxBudget ? String(Math.round(suggestion.maxBudget)) : undefined,
          address: suggestion.address ?? undefined,
        });
        return;
      }
      const questions = suggestion.questions ?? [];
      setShowMinBudget(Boolean(suggestion.minBudget));
      setDraft({
        text: trimmed,
        title: suggestion.title,
        description: suggestion.description,
        categoryId: suggestion.categoryId ?? null,
        minBudget: suggestion.minBudget ? String(Math.round(suggestion.minBudget)) : '',
        maxBudget: suggestion.maxBudget ? String(Math.round(suggestion.maxBudget)) : '',
        isFixedPrice: false,
        address: suggestion.address ?? '',
        questions,
        answers: Object.fromEntries(
          questions
            .filter((question) => question.selected)
            .map((question) => [question.label, question.selected as string])
        ),
      });
    } catch {
      setError('Yazdıklarınız işlenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIsReading(false);
    }
  };

  const update = (changes: Partial<Draft>) =>
    setDraft((current) => (current ? { ...current, ...changes } : current));

  const validate = (current: Draft): string | null => {
    if (current.title.trim().length < 5) return 'Başlık en az 5 karakter olmalı.';
    if (!current.categoryId) return 'İlanınız için bir kategori seçin.';
    if (current.isFixedPrice && !(Number(current.maxBudget) > 0)) {
      return 'Hemen almak istediğiniz fiyatı yazın.';
    }
    if (!current.isFixedPrice && current.minBudget && current.maxBudget && Number(current.minBudget) > Number(current.maxBudget)) {
      return 'En az bütçe, en fazla bütçeden büyük olamaz.';
    }
    return null;
  };

  const publish = async () => {
    if (!draft) return;
    const problem = validate(draft);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setIsPublishing(true);
    try {
      const request: CreateNeedRequest = {
        title: draft.title.trim(),
        description: describe(draft),
        categoryId: draft.categoryId!,
        urgency: URGENCY_NORMAL as unknown as CreateNeedRequest['urgency'],
      };
      if (draft.isFixedPrice) request.isFixedPrice = true;
      else if (draft.minBudget) request.minBudget = Number(draft.minBudget);
      if (draft.maxBudget) request.maxBudget = Number(draft.maxBudget);
      if (draft.address.trim()) request.address = draft.address.trim();

      const created = await needAPI.createNeed(request);
      const inReview = String(created.status) === 'PendingReview';
      leavingRef.current = true;
      Alert.alert(
        inReview ? 'İlanınız Alındı' : 'İlanınız Yayında',
        inReview
          ? 'İlanınız alındı. Kısa bir incelemenin ardından yayınlanacak.'
          : 'İlanınız yayında. Teklif geldiğinde size haber vereceğiz.',
        [{ text: 'İlanlarıma Git', onPress: () => navigation.replace('MyNeeds') }],
        { cancelable: false }
      );
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'İlan kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const openDetailedForm = () => {
    leavingRef.current = true;
    navigation.replace('CreateNeedDetailed', {
      prefill: draft
        ? {
            title: draft.title,
            description: describe(draft),
            categoryId: draft.categoryId,
            minBudget: draft.minBudget,
            maxBudget: draft.maxBudget,
            isFixedPrice: draft.isFixedPrice,
            address: draft.address,
          }
        : undefined,
    });
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
        <Text style={styles.headerTitle}>İlan Ver</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!draft ? (
            <View style={styles.card}>
              <Text style={styles.question} accessibilityRole="header">
                Ne arıyorsunuz?
              </Text>
              <Text style={styles.hint}>
                Tek cümle yeter. Bütçenizi ve şehrinizi de yazarsanız ilanınız kendiliğinden dolar.
              </Text>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={EXAMPLES[0]}
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Ne arıyorsunuz?"
                multiline
                autoFocus
                maxLength={2000}
                textAlignVertical="top"
                style={styles.textArea}
              />

              <Text style={styles.examplesLabel}>Örnekler</Text>
              {EXAMPLES.map((example) => (
                <TouchableOpacity
                  key={example}
                  onPress={() => setText(example)}
                  style={styles.exampleChip}
                  accessibilityRole="button"
                  accessibilityLabel={`Örnek: ${example}`}
                >
                  <Text style={styles.exampleText}>{example}</Text>
                </TouchableOpacity>
              ))}

              {error ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}

              <Button
                title="Devam Et"
                onPress={readText}
                loading={isReading}
                disabled={isReading}
                fullWidth
                style={styles.primaryAction}
              />
              <TouchableOpacity onPress={openDetailedForm} style={styles.linkButton} accessibilityRole="button">
                <Text style={styles.linkText}>Ayrıntılı formu kullan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.question} accessibilityRole="header">
                İlanınız hazır
              </Text>
              <Text style={styles.hint}>
                Yazdıklarınızdan çıkardıklarımızı kontrol edin; yanlış olanı düzeltip yayınlayın.
              </Text>

              <Text style={styles.previewLabel}>İlanınız listede böyle görünecek</Text>
              <View style={styles.preview}>
                <View style={styles.previewTile}>
                  <MaterialIcons name="sell" size={28} color={colors.primary} />
                </View>
                <View style={styles.previewBody}>
                  <Text style={styles.previewCategory} numberOfLines={1}>
                    {selectedCategory ? selectedCategory.nameTr || selectedCategory.name : 'Kategori seçilmedi'}
                  </Text>
                  <Text style={styles.previewTitle} numberOfLines={2}>
                    {draft.title || 'Başlık'}
                  </Text>
                  <Text style={styles.previewBudget}>{budgetText(draft)}</Text>
                  <Text style={styles.previewMeta} numberOfLines={1}>
                    {[draft.address.trim(), ...Object.values(draft.answers)].filter(Boolean).join(' · ') ||
                      'Konum belirtilmemiş'}
                  </Text>
                </View>
              </View>

              <Input
                label="Başlık"
                value={draft.title}
                onChangeText={(value) => update({ title: value })}
                maxLength={200}
              />

              <Text style={styles.fieldLabel}>Kategori</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(true)}
                style={[styles.selector, !draft.categoryId && styles.selectorMissing]}
                accessibilityRole="button"
                accessibilityLabel={`Kategori: ${selectedCategory?.nameTr ?? 'seçilmedi'}`}
              >
                <Text style={selectedCategory ? styles.selectorText : styles.selectorPlaceholder}>
                  {selectedCategory ? selectedCategory.nameTr || selectedCategory.name : 'Kategori seçin'}
                </Text>
                <MaterialIcons name="expand-more" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
              {!draft.categoryId ? (
                <Text style={styles.fieldHint}>Kategoriyi yazdıklarınızdan çıkaramadık; listeden seçin.</Text>
              ) : null}

              <Text style={styles.fieldLabel}>Fiyat</Text>
              <PriceModeSelector
                isFixedPrice={draft.isFixedPrice}
                onChange={(isFixedPrice) => update({ isFixedPrice, ...(isFixedPrice ? { minBudget: '' } : {}) })}
              />
              {draft.isFixedPrice ? (
                <Input
                  label="Fiyatınız (TL)"
                  placeholder="Örn. 15.000"
                  keyboardType="number-pad"
                  value={formatAmount(draft.maxBudget)}
                  onChangeText={(value) => update({ maxBudget: digitsOnly(value) })}
                />
              ) : (
                <>
                  {showMinBudget ? (
                    <Input
                      label="En az bütçe (TL)"
                      placeholder="İsteğe bağlı"
                      keyboardType="number-pad"
                      value={formatAmount(draft.minBudget)}
                      onChangeText={(value) => update({ minBudget: digitsOnly(value) })}
                    />
                  ) : null}
                  <Input
                    label="En fazla bütçe (TL)"
                    placeholder="İsteğe bağlı"
                    keyboardType="number-pad"
                    value={formatAmount(draft.maxBudget)}
                    onChangeText={(value) => update({ maxBudget: digitsOnly(value) })}
                  />
                </>
              )}

              <Input
                label="Konum"
                placeholder="Şehir veya ilçe (isteğe bağlı)"
                leftIcon="location-on"
                value={draft.address}
                onChangeText={(value) => update({ address: value })}
                maxLength={500}
              />

              {draft.questions.map((question) => (
                <View key={question.label} style={styles.questionBlock}>
                  <Text style={styles.fieldLabel}>{question.label}</Text>
                  <View style={styles.optionRow}>
                    {question.options.map((option) => {
                      const isSelected = draft.answers[question.label] === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          onPress={() => {
                            const answers = { ...draft.answers };
                            if (isSelected) delete answers[question.label];
                            else answers[question.label] = option;
                            update({ answers });
                          }}
                          style={[styles.option, isSelected && styles.optionSelected]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          accessibilityLabel={`${question.label}: ${option}`}
                        >
                          <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              {error ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {error}
                </Text>
              ) : null}

              <Button
                title="İlanı Yayınla"
                onPress={publish}
                loading={isPublishing}
                disabled={isPublishing}
                fullWidth
                style={styles.primaryAction}
              />
              <Button
                title="Fotoğraf veya Detay Ekle"
                onPress={openDetailedForm}
                variant="outline"
                disabled={isPublishing}
                fullWidth
                style={styles.secondaryAction}
              />
              <TouchableOpacity
                onPress={() => {
                  setDraft(null);
                  setError(null);
                }}
                disabled={isPublishing}
                style={styles.linkButton}
                accessibilityRole="button"
              >
                <Text style={styles.linkText}>Baştan Yaz</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showCategoryModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setShowCategoryModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              hitSlop={12}
            >
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Kategori Seçin</Text>
            <View style={{ width: 24 }} />
          </View>
          <SectionList
            sections={categorySections}
            keyExtractor={(item) => item.id.toString()}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
            renderItem={({ item }) => {
              const isSelected = item.id === draft?.categoryId;
              return (
                <TouchableOpacity
                  onPress={() => {
                    update({ categoryId: item.id });
                    setShowCategoryModal(false);
                  }}
                  style={styles.categoryRow}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
                    {item.nameTr || item.name}
                  </Text>
                  {isSelected ? <MaterialIcons name="check" size={22} color={colors.primary} /> : null}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: typography.h3.fontSize, fontWeight: '600', color: colors.text },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  question: { fontSize: typography.h3.fontSize, fontWeight: '700', color: colors.text },
  hint: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: spacing.xs },
  textArea: {
    marginTop: spacing.md,
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 17,
    color: colors.text,
  },
  examplesLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  exampleChip: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  exampleText: { fontSize: 14, color: colors.textSecondary },
  error: { marginTop: spacing.md, fontSize: 14, fontWeight: '600', color: colors.error },
  primaryAction: { marginTop: spacing.lg },
  secondaryAction: { marginTop: spacing.sm },
  linkButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm },
  linkText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  previewLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  preview: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    padding: 12,
    marginBottom: spacing.md,
  },
  previewTile: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryExtraLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  previewBody: { flex: 1 },
  previewCategory: { fontSize: 12, fontWeight: '600', color: colors.primaryDark },
  previewTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 2 },
  previewBudget: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: 4 },
  previewMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: spacing.xs },
  fieldHint: { fontSize: 13, color: colors.textSecondary, marginTop: -spacing.sm, marginBottom: spacing.md },
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
    marginBottom: spacing.md,
  },
  selectorMissing: { borderColor: colors.secondaryOrangeDark },
  selectorText: { fontSize: 16, color: colors.text },
  selectorPlaceholder: { fontSize: 16, color: colors.textSecondary },
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
  modalContainer: { flex: 1, backgroundColor: colors.background },
  categoryList: { paddingBottom: spacing.xl },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
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
  categoryNameSelected: { fontWeight: '700', color: colors.primary },
});

export default withCreateNeedAuth(QuickNeedScreen);
