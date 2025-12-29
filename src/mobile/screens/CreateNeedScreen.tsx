import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { needAPI, categoryAPI } from '../services/api';
import { Category, CreateNeedRequest } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Loading from '../components/ui/Loading';
import ErrorMessage from '../components/ui/ErrorMessage';
import { colors, spacing, typography } from '../theme';
import { RootStackParamList } from '../types';
import { withCreateNeedAuth } from '../hoc/withAuthPrompt';

type CreateNeedScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateNeed'>;

interface FormData {
  title: string;
  description: string;
  categoryId: number | null;
  minBudget: string;
  maxBudget: string;
  address: string;
  urgency: 'Flexible' | 'Normal' | 'Urgent';
}

interface FormErrors {
  title?: string;
  description?: string;
  categoryId?: string;
  minBudget?: string;
  maxBudget?: string;
  address?: string;
}

const CreateNeedScreen: React.FC = () => {
  const navigation = useNavigation<CreateNeedScreenNavigationProp>();
  const { user } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    categoryId: null,
    minBudget: '',
    maxBudget: '',
    address: '',
    urgency: 'Normal',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const categoriesData = await categoryAPI.getCategories();
      setCategories(categoriesData.filter(cat => cat.isActive));
    } catch (err) {
      console.error('Kategoriler yüklenirken hata:', err);
      Alert.alert('Hata', 'Kategoriler yüklenirken hata oluştu');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Başlık gereklidir';
    } else if (formData.title.length < 10) {
      newErrors.title = 'Başlık en az 10 karakter olmalıdır';
    } else if (formData.title.length > 100) {
      newErrors.title = 'Başlık en fazla 100 karakter olabilir';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Açıklama gereklidir';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Açıklama en az 20 karakter olmalıdır';
    } else if (formData.description.length > 1000) {
      newErrors.description = 'Açıklama en fazla 1000 karakter olabilir';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Kategori seçimi gereklidir';
    }

    if (formData.minBudget && isNaN(Number(formData.minBudget))) {
      newErrors.minBudget = 'Geçerli bir sayı giriniz';
    }

    if (formData.maxBudget && isNaN(Number(formData.maxBudget))) {
      newErrors.maxBudget = 'Geçerli bir sayı giriniz';
    }

    if (formData.minBudget && formData.maxBudget) {
      const min = Number(formData.minBudget);
      const max = Number(formData.maxBudget);
      if (min >= max) {
        newErrors.maxBudget = 'Maksimum bütçe minimum bütçeden büyük olmalıdır';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user) {
      Alert.alert('Hata', 'Giriş yapmanız gerekiyor');
      return;
    }

    try {
      setLoading(true);

      // Map urgency string to backend enum value
      const urgencyMap: Record<string, number> = {
        'Flexible': 1,
        'Normal': 2,
        'Urgent': 3,
      };

      const requestData: CreateNeedRequest = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        categoryId: formData.categoryId!,
        urgency: urgencyMap[formData.urgency] as unknown as 'Flexible' | 'Normal' | 'Urgent',
      };

      if (formData.minBudget) {
        requestData.minBudget = Number(formData.minBudget);
      }

      if (formData.maxBudget) {
        requestData.maxBudget = Number(formData.maxBudget);
      }

      if (formData.address.trim()) {
        requestData.address = formData.address.trim();
      }

      await needAPI.createNeed(requestData);

      Alert.alert(
        'Başarılı',
        'İhtiyacınız başarıyla oluşturuldu!',
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
        err.response?.data?.message || 'İhtiyaç oluşturulurken hata oluştu'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setFormData(prev => ({ ...prev, categoryId: category.id }));
    setShowCategoryModal(false);
    setErrors(prev => ({ ...prev, categoryId: undefined }));
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

  // Format number with thousand separator (Turkish format: 1.000.000)
  const formatBudget = (value: string): string => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    return Number(numericValue).toLocaleString('tr-TR');
  };

  // Parse formatted budget string to raw number string
  const parseBudget = (formattedValue: string): string => {
    return formattedValue.replace(/\./g, '');
  };

  // Handle budget input change with formatting
  const handleBudgetChange = (field: 'minBudget' | 'maxBudget', value: string) => {
    const rawValue = parseBudget(value);
    setFormData(prev => ({ ...prev, [field]: rawValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Validate individual field on blur
  const validateField = (field: keyof FormData) => {
    const newErrors: FormErrors = { ...errors };

    switch (field) {
      case 'title':
        if (!formData.title.trim()) {
          newErrors.title = 'Başlık gereklidir';
        } else if (formData.title.length < 10) {
          newErrors.title = 'Başlık en az 10 karakter olmalıdır';
        } else if (formData.title.length > 100) {
          newErrors.title = 'Başlık en fazla 100 karakter olabilir';
        } else {
          delete newErrors.title;
        }
        break;

      case 'description':
        if (!formData.description.trim()) {
          newErrors.description = 'Açıklama gereklidir';
        } else if (formData.description.length < 20) {
          newErrors.description = 'Açıklama en az 20 karakter olmalıdır';
        } else if (formData.description.length > 1000) {
          newErrors.description = 'Açıklama en fazla 1000 karakter olabilir';
        } else {
          delete newErrors.description;
        }
        break;

      case 'minBudget':
        if (formData.minBudget && isNaN(Number(formData.minBudget))) {
          newErrors.minBudget = 'Geçerli bir sayı giriniz';
        } else {
          delete newErrors.minBudget;
        }
        break;

      case 'maxBudget':
        if (formData.maxBudget && isNaN(Number(formData.maxBudget))) {
          newErrors.maxBudget = 'Geçerli bir sayı giriniz';
        } else if (formData.minBudget && formData.maxBudget) {
          const min = Number(formData.minBudget);
          const max = Number(formData.maxBudget);
          if (min >= max) {
            newErrors.maxBudget = 'Maksimum bütçe minimum bütçeden büyük olmalıdır';
          } else {
            delete newErrors.maxBudget;
          }
        } else {
          delete newErrors.maxBudget;
        }
        break;

      case 'categoryId':
        if (!formData.categoryId) {
          newErrors.categoryId = 'Kategori seçimi gereklidir';
        } else {
          delete newErrors.categoryId;
        }
        break;
    }

    setErrors(newErrors);
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => handleCategorySelect(item)}
    >
      <View style={styles.categoryContent}>
        <MaterialIcons name="category" size={24} color={colors.primary} />
        <View style={styles.categoryText}>
          <Text style={styles.categoryName}>{item.nameTr}</Text>
          {item.description && (
            <Text style={styles.categoryDescription}>{item.description}</Text>
          )}
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderUrgencyOption = (urgency: 'Flexible' | 'Normal' | 'Urgent') => (
    <TouchableOpacity
      key={urgency}
      style={[
        styles.urgencyOption,
        formData.urgency === urgency && styles.urgencyOptionSelected,
      ]}
      onPress={() => setFormData(prev => ({ ...prev, urgency }))}
    >
      <View style={[
        styles.urgencyIndicator,
        { backgroundColor: getUrgencyColor(urgency) }
      ]} />
      <Text style={[
        styles.urgencyText,
        formData.urgency === urgency && styles.urgencyTextSelected,
      ]}>
        {getUrgencyText(urgency)}
      </Text>
    </TouchableOpacity>
  );

  if (categoriesLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>İhtiyaç Oluştur</Text>
          <View style={{ width: 24 }} />
        </View>
        <Loading text="Kategoriler yükleniyor..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İhtiyaç Oluştur</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Temel Bilgiler</Text>

          <Input
            label="Başlık *"
            placeholder="İhtiyacınızı kısaca özetleyin"
            value={formData.title}
            onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            onBlur={() => validateField('title')}
            error={errors.title}
            maxLength={100}
          />

          <Input
            label="Açıklama *"
            placeholder="İhtiyacınızı detaylı bir şekilde açıklayın"
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            onBlur={() => validateField('description')}
            error={errors.description}
            multiline
            numberOfLines={4}
            maxLength={1000}
          />

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Kategori *</Text>
            <TouchableOpacity
              style={[
                styles.categorySelector,
                errors.categoryId ? styles.categoryError : null,
              ]}
              onPress={() => setShowCategoryModal(true)}
            >
              <View style={styles.categorySelectorContent}>
                <MaterialIcons name="category" size={20} color={colors.textSecondary} />
                <Text style={[
                  styles.categorySelectorText,
                  !selectedCategory && styles.categorySelectorPlaceholder,
                ]}>
                  {selectedCategory ? selectedCategory.nameTr : 'Kategori seçin'}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {errors.categoryId && (
              <Text style={styles.errorText}>{errors.categoryId}</Text>
            )}
          </View>
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Bütçe</Text>
          <Text style={styles.sectionDescription}>
            Bütçe belirtmek isteğe bağlıdır. Belirtirseniz size daha uygun teklifler alabilirsiniz.
          </Text>

          <View style={styles.budgetContainer}>
            <Input
              label="Minimum Bütçe (TL)"
              placeholder="0"
              value={formatBudget(formData.minBudget)}
              onChangeText={(text) => handleBudgetChange('minBudget', text)}
              onBlur={() => validateField('minBudget')}
              error={errors.minBudget}
              keyboardType="numeric"
              style={styles.budgetInput}
            />

            <Input
              label="Maksimum Bütçe (TL)"
              placeholder="0"
              value={formatBudget(formData.maxBudget)}
              onChangeText={(text) => handleBudgetChange('maxBudget', text)}
              onBlur={() => validateField('maxBudget')}
              error={errors.maxBudget}
              keyboardType="numeric"
              style={styles.budgetInput}
            />
          </View>
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Konum</Text>
          <Text style={styles.sectionDescription}>
            Konum belirtmek isteğe bağlıdır. Yakınınızdaki sağlayıcıları bulmanıza yardımcı olur.
          </Text>

          <Input
            label="Adres"
            placeholder="Şehir, ilçe veya mahalle"
            value={formData.address}
            onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
            error={errors.address}
            leftIcon="location-on"
          />
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Aciliyet Durumu</Text>
          <Text style={styles.sectionDescription}>
            İhtiyacınızın ne kadar acil olduğunu belirtin.
          </Text>

          <View style={styles.urgencyContainer}>
            {renderUrgencyOption('Flexible')}
            {renderUrgencyOption('Normal')}
            {renderUrgencyOption('Urgent')}
          </View>
        </Card>

        <View style={styles.actionContainer}>
          <Button
            title="İhtiyacı Oluştur"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            fullWidth
            icon="add"
          />
        </View>
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Kategori Seçin</Text>
            <View style={{ width: 24 }} />
          </View>

          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.categoryList}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>
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
  formCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  categoryError: {
    borderColor: colors.error,
  },
  categorySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categorySelectorText: {
    fontSize: typography.body.fontSize,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  categorySelectorPlaceholder: {
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.xs,
  },
  budgetContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  budgetInput: {
    flex: 1,
  },
  urgencyContainer: {
    gap: spacing.sm,
  },
  urgencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  urgencyOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  urgencyIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  urgencyText: {
    fontSize: typography.body.fontSize,
    color: colors.text,
  },
  urgencyTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
  },
  categoryList: {
    padding: spacing.lg,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  categoryName: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  categoryDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default withCreateNeedAuth(CreateNeedScreen);