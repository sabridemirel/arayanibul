import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { needAPI, offerAPI } from '../services/api';
import { Need, CreateOfferRequest } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import ErrorMessage from '../components/ui/ErrorMessage';
import { colors, spacing, typography } from '../theme';
import { RootStackParamList } from '../types';
import { withMakeOfferAuth } from '../hoc/withAuthPrompt';

type CreateOfferScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateOffer'>;
type CreateOfferScreenRouteProp = RouteProp<RootStackParamList, 'CreateOffer'>;

const CreateOfferScreen: React.FC = () => {
  const navigation = useNavigation<CreateOfferScreenNavigationProp>();
  const route = useRoute<CreateOfferScreenRouteProp>();
  const { user } = useAuth();
  const { needId } = route.params;

  const [need, setNeed] = useState<Need | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');

  // Form validation
  const [errors, setErrors] = useState<{
    price?: string;
    description?: string;
    deliveryDays?: string;
  }>({});

  useEffect(() => {
    loadNeedDetail();
  }, [needId]);

  const loadNeedDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const needData = await needAPI.getNeedById(needId);
      setNeed(needData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'İhtiyaç detayları yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Price validation
    const priceNum = parseFloat(price);
    if (!price.trim()) {
      newErrors.price = 'Fiyat gereklidir';
    } else if (isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = 'Geçerli bir fiyat giriniz';
    } else if (need?.maxBudget && priceNum > need.maxBudget) {
      newErrors.price = `Maksimum bütçe ${need.maxBudget.toLocaleString()} TL`;
    }

    // Description validation
    if (!description.trim()) {
      newErrors.description = 'Açıklama gereklidir';
    } else if (description.trim().length < 50) {
      newErrors.description = 'Açıklama en az 50 karakter olmalıdır';
    }

    // Delivery days validation
    const deliveryNum = parseInt(deliveryDays);
    if (!deliveryDays.trim()) {
      newErrors.deliveryDays = 'Teslimat süresi gereklidir';
    } else if (isNaN(deliveryNum) || deliveryNum <= 0) {
      newErrors.deliveryDays = 'Geçerli bir teslimat süresi giriniz';
    } else if (deliveryNum > 365) {
      newErrors.deliveryDays = 'Teslimat süresi 365 günden fazla olamaz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      
      const offerData: CreateOfferRequest = {
        needId,
        price: parseFloat(price),
        description: description.trim(),
        deliveryDays: parseInt(deliveryDays),
      };

      await offerAPI.createOffer(offerData);
      
      Alert.alert(
        'Başarılı',
        'Teklifiniz başarıyla gönderildi!',
        [
          {
            text: 'Tamam',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(
        'Hata',
        err.response?.data?.message || 'Teklif gönderilirken hata oluştu'
      );
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Teklif Ver</Text>
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
          <Text style={styles.headerTitle}>Teklif Ver</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Teklif Ver</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Need Summary */}
          <Card style={styles.needSummary}>
            <View style={styles.needHeader}>
              <Text style={styles.needTitle}>{need.title}</Text>
              <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(need.urgency) }]}>
                <Text style={styles.urgencyText}>
                  {getUrgencyText(need.urgency)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.needDescription} numberOfLines={3}>
              {need.description}
            </Text>

            <View style={styles.needInfo}>
              <View style={styles.infoRow}>
                <MaterialIcons name="category" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>
                  {need.category?.nameTr || 'Kategori'}
                </Text>
              </View>

              {(need.minBudget || need.maxBudget) && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="attach-money" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoText}>
                    {formatBudget(need.minBudget, need.maxBudget, need.currency)}
                  </Text>
                </View>
              )}
            </View>
          </Card>

          {/* Offer Form */}
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>Teklif Detayları</Text>

            {/* Price Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Fiyat <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.priceInputContainer}>
                <TextInput
                  style={[styles.priceInput, errors.price ? styles.inputError : null]}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0"
                  keyboardType="numeric"
                  maxLength={10}
                />
                <Text style={styles.currencyText}>TL</Text>
              </View>
              {errors.price && (
                <Text style={styles.errorText}>{errors.price}</Text>
              )}
              {need.maxBudget && (
                <Text style={styles.helperText}>
                  Maksimum bütçe: {need.maxBudget.toLocaleString()} TL
                </Text>
              )}
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Açıklama <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textArea, errors.description ? styles.inputError : null]}
                value={description}
                onChangeText={setDescription}
                placeholder="Teklifinizi detaylı olarak açıklayın..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={1000}
              />
              <View style={styles.characterCount}>
                <Text style={styles.helperText}>
                  {description.length}/1000 karakter (min. 50)
                </Text>
              </View>
              {errors.description && (
                <Text style={styles.errorText}>{errors.description}</Text>
              )}
            </View>

            {/* Delivery Days Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Teslimat Süresi <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.deliveryInputContainer}>
                <TextInput
                  style={[styles.deliveryInput, errors.deliveryDays ? styles.inputError : null]}
                  value={deliveryDays}
                  onChangeText={setDeliveryDays}
                  placeholder="0"
                  keyboardType="numeric"
                  maxLength={3}
                />
                <Text style={styles.deliveryText}>gün içinde</Text>
              </View>
              {errors.deliveryDays && (
                <Text style={styles.errorText}>{errors.deliveryDays}</Text>
              )}
              <Text style={styles.helperText}>
                Teklif edilen ürün/hizmeti kaç gün içinde teslim edebilirsiniz?
              </Text>
            </View>
          </Card>

          {/* Terms */}
          <Card style={styles.termsCard}>
            <View style={styles.termsHeader}>
              <MaterialIcons name="info" size={20} color={colors.primary} />
              <Text style={styles.termsTitle}>Önemli Bilgiler</Text>
            </View>
            <Text style={styles.termsText}>
              • Teklifiniz gönderildikten sonra alıcı tarafından görüntülenecektir{'\n'}
              • Teklif kabul edildiğinde mesajlaşma başlayacaktır{'\n'}
              • Teklif fiyatınız ve teslimat süreniz bağlayıcıdır{'\n'}
              • Uygunsuz teklifler sistem tarafından kaldırılabilir
            </Text>
          </Card>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <Button
            title={submitting ? "Gönderiliyor..." : "Teklif Gönder"}
            onPress={handleSubmit}
            disabled={submitting}
            loading={submitting}
            fullWidth
            icon="send"
          />
        </View>
      </KeyboardAvoidingView>
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
  },
  needSummary: {
    margin: spacing.lg,
    marginBottom: spacing.md,
  },
  needHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  needTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
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
  needDescription: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  needInfo: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  formCard: {
    margin: spacing.lg,
    marginTop: 0,
  },
  formTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.error,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.text,
  },
  currencyText: {
    paddingHorizontal: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.text,
    backgroundColor: colors.surface,
    minHeight: 100,
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
  deliveryInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  deliveryInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.text,
    minWidth: 80,
  },
  deliveryText: {
    paddingHorizontal: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  termsCard: {
    margin: spacing.lg,
    marginTop: 0,
  },
  termsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  termsTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginLeft: spacing.sm,
  },
  termsText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  submitContainer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default withMakeOfferAuth(CreateOfferScreen);