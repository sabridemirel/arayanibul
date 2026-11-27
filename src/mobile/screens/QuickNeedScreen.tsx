import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { needAPI } from '../services/api';
import { RootStackParamList } from '../types';
import Button from '../components/ui/Button';
import BackButton from '../components/BackButton';
import { emptyListingValues } from '../components/need/listingForm';
import { colors, spacing, typography, borderRadius } from '../theme';
import { withCreateNeedAuth } from '../hoc/withAuthPrompt';

type Navigation = StackNavigationProp<RootStackParamList, 'CreateNeed'>;

const EXAMPLES = [
  'İkinci el RTX 3080, 15 bin TL, İstanbul',
  'Cybex oto koltuğu, temiz kullanılmış, Ankara',
  '4 kişilik kamp çadırı, Bursa',
];

const MIN_TEXT_LENGTH = 3;

/**
 * Quick listing, step one: one sentence. The server suggests title, category, price and location,
 * and the same listing form as "Ayrıntılı formu kullan" opens with them filled in.
 */
const QuickNeedScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<RootStackParamList, 'CreateNeed'>>();

  const [text, setText] = useState(route.params?.initialText ?? '');
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Leaving with typed text (back arrow, Android back button, iOS swipe) asks first
  const leavingRef = useRef(false);
  const hasContent = text.trim().length > 0;
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
      // A price in the sentence ("15 bin TL") reads as "bu fiyata hemen alırım"; the buyer can
      // switch to offers in the form. Without one the listing is open to offers.
      const price = suggestion.maxBudget ?? suggestion.minBudget ?? null;
      const questions = suggestion.questions ?? [];
      leavingRef.current = true;
      navigation.replace('CreateNeedDetailed', {
        prefill: {
          values: {
            ...emptyListingValues(),
            title: suggestion.title,
            description: suggestion.description,
            categoryId: suggestion.categoryId ?? null,
            isFixedPrice: price != null,
            price: price != null ? String(Math.round(price)) : '',
            address: suggestion.address ?? '',
            answers: Object.fromEntries(
              questions.filter((q) => q.selected).map((q) => [q.label, q.selected as string])
            ),
          },
          questions,
          product: suggestion.productSlug
            ? {
                slug: suggestion.productSlug,
                name: suggestion.productName ?? suggestion.title,
                realPrice: suggestion.productRealPrice ?? null,
              }
            : null,
        },
      });
    } catch {
      setError('Yazdıklarınız işlenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIsReading(false);
    }
  };

  const openDetailedForm = () => {
    leavingRef.current = true;
    navigation.replace('CreateNeedDetailed', { detailsOpen: true });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle} accessibilityRole="header">
          İlan Ver
        </Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.question} accessibilityRole="header">
              Ne arıyorsunuz?
            </Text>
            <Text style={styles.hint}>
              Tek cümle yeter. Fiyatınızı ve şehrinizi de yazarsanız ilanınız kendiliğinden dolar.
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

            <Button title="Devam Et" onPress={readText} loading={isReading} disabled={isReading} fullWidth style={styles.primaryAction} />
            <TouchableOpacity onPress={openDetailedForm} style={styles.linkButton} accessibilityRole="button">
              <Text style={styles.linkText}>Ayrıntılı formu kullan</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  examplesLabel: { marginTop: spacing.md, marginBottom: spacing.xs, fontSize: 13, fontWeight: '600', color: colors.textSecondary },
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
  linkButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm },
  linkText: { fontSize: 15, fontWeight: '600', color: colors.primary },
});

export default withCreateNeedAuth(QuickNeedScreen);
