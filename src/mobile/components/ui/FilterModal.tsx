import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { NeedFilters, Category } from '../../types';
import Button from './Button';

interface FilterModalProps {
  visible: boolean;
  filters: NeedFilters;
  categories: Category[];
  onApply: (filters: NeedFilters) => void;
  onClear: () => void;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.85;

// Urgency type definitions
type UrgencyType = 'Flexible' | 'Normal' | 'Urgent' | '';

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  filters,
  categories,
  onApply,
  onClear,
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [localFilters, setLocalFilters] = useState<NeedFilters>(filters);

  // Budget range state
  const [minBudget, setMinBudget] = useState<number>(filters.minBudget || 0);
  const [maxBudget, setMaxBudget] = useState<number>(filters.maxBudget || 50000);
  const [radius, setRadius] = useState<number>(filters.radius || 10);

  // Urgency levels matching backend enum
  const urgencyLevels: Array<{ label: string; value: UrgencyType }> = [
    { label: 'Esnek', value: 'Flexible' },
    { label: 'Normal', value: 'Normal' },
    { label: 'Acil', value: 'Urgent' },
  ];

  useEffect(() => {
    setLocalFilters(filters);
    setMinBudget(filters.minBudget || 0);
    setMaxBudget(filters.maxBudget || 50000);
    setRadius(filters.radius || 10);
  }, [filters]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleApply = () => {
    const appliedFilters: NeedFilters = {
      ...localFilters,
      minBudget: minBudget > 0 ? minBudget : undefined,
      maxBudget: maxBudget < 50000 ? maxBudget : undefined,
      radius: radius > 0 ? radius : undefined,
    };
    onApply(appliedFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters: NeedFilters = {};
    setLocalFilters(clearedFilters);
    setMinBudget(0);
    setMaxBudget(50000);
    setRadius(10);
    onClear();
  };

  const handleCategorySelect = (categoryId: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalFilters({
      ...localFilters,
      categoryId: localFilters.categoryId === categoryId ? undefined : categoryId,
    });
  };

  const handleUrgencySelect = (urgency: UrgencyType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalFilters({
      ...localFilters,
      urgency: localFilters.urgency === urgency ? undefined : (urgency || undefined),
    });
  };

  const handleBudgetPreset = (min: number, max: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMinBudget(min);
    setMaxBudget(max);
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [MODAL_HEIGHT, 0],
  });

  const opacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const getCategoryColor = (category: Category): string => {
    // Use category-specific colors from theme
    const categoryColors: Record<string, string> = {
      services: colors.categoryColors?.services || colors.primary,
      hizmetler: colors.categoryColors?.services || colors.primary,
      products: colors.categoryColors?.products || colors.secondaryOrange,
      ürünler: colors.categoryColors?.products || colors.secondaryOrange,
      events: colors.categoryColors?.events || colors.primary,
      etkinlikler: colors.categoryColors?.events || colors.primary,
      jobs: colors.categoryColors?.jobs || colors.accent,
      işler: colors.categoryColors?.jobs || colors.accent,
      housing: colors.categoryColors?.housing || colors.success,
      konut: colors.categoryColors?.housing || colors.success,
      automotive: colors.categoryColors?.automotive || colors.error,
      otomotiv: colors.categoryColors?.automotive || colors.error,
      education: colors.categoryColors?.education || colors.info,
      eğitim: colors.categoryColors?.education || colors.info,
      health: colors.categoryColors?.health || colors.success,
      sağlık: colors.categoryColors?.health || colors.success,
      other: colors.categoryColors?.other || colors.textSecondary,
      diğer: colors.categoryColors?.other || colors.textSecondary,
    };

    // Use name property (English) or nameTr property (Turkish) for color mapping
    const categoryKey = (category.name || category.nameTr).toLowerCase();
    return categoryColors[categoryKey] || colors.primary;
  };

  const getUrgencyColor = (urgency: UrgencyType): string => {
    switch (urgency) {
      case 'Urgent': return colors.urgentDark;
      case 'Normal': return colors.normal;
      case 'Flexible': return colors.flexible;
      default: return colors.textSecondary;
    }
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (localFilters.categoryId) count++;
    if (minBudget > 0 || maxBudget < 50000) count++;
    if (radius > 0 && radius !== 10) count++;
    if (localFilters.urgency) count++;
    return count;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                { transform: [{ translateY }] },
              ]}
            >
              {/* Handle bar */}
              <View style={styles.handleBar} />

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.title}>Filtrele</Text>
                  {getActiveFilterCount() > 0 && (
                    <View style={styles.headerBadge}>
                      <Text style={styles.headerBadgeText}>{getActiveFilterCount()}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Kapat"
                  accessibilityHint="Filtreleme modalını kapatmak için çift dokunun"
                >
                  <MaterialIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
              >
                {/* Category Filter */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Kategori</Text>
                  <View style={styles.chipsContainer}>
                    {categories.map((category) => {
                      const isSelected = localFilters.categoryId === category.id;
                      const categoryColor = getCategoryColor(category);

                      return (
                        <CategoryChip
                          key={category.id}
                          category={category}
                          selected={isSelected}
                          categoryColor={categoryColor}
                          onPress={() => handleCategorySelect(category.id)}
                        />
                      );
                    })}
                  </View>
                </View>

                {/* Budget Range Filter */}
                <View style={styles.filterSection}>
                  <View style={styles.budgetHeader}>
                    <Text style={styles.filterLabel}>Bütçe Aralığı</Text>
                    <Text style={styles.budgetDisplay}>
                      {minBudget.toLocaleString('tr-TR')} - {maxBudget.toLocaleString('tr-TR')} TRY
                    </Text>
                  </View>

                  {/* Budget Presets */}
                  <View style={styles.budgetPresets}>
                    <Pressable
                      onPress={() => handleBudgetPreset(0, 50000)}
                      style={[
                        styles.budgetPreset,
                        minBudget === 0 && maxBudget === 50000 && styles.budgetPresetActive
                      ]}
                    >
                      <Text style={[
                        styles.budgetPresetText,
                        minBudget === 0 && maxBudget === 50000 && styles.budgetPresetTextActive
                      ]}>Tümü</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleBudgetPreset(0, 1000)}
                      style={[
                        styles.budgetPreset,
                        minBudget === 0 && maxBudget === 1000 && styles.budgetPresetActive
                      ]}
                    >
                      <Text style={[
                        styles.budgetPresetText,
                        minBudget === 0 && maxBudget === 1000 && styles.budgetPresetTextActive
                      ]}>0-1K</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleBudgetPreset(1000, 5000)}
                      style={[
                        styles.budgetPreset,
                        minBudget === 1000 && maxBudget === 5000 && styles.budgetPresetActive
                      ]}
                    >
                      <Text style={[
                        styles.budgetPresetText,
                        minBudget === 1000 && maxBudget === 5000 && styles.budgetPresetTextActive
                      ]}>1K-5K</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleBudgetPreset(5000, 50000)}
                      style={[
                        styles.budgetPreset,
                        minBudget === 5000 && maxBudget === 50000 && styles.budgetPresetActive
                      ]}
                    >
                      <Text style={[
                        styles.budgetPresetText,
                        minBudget === 5000 && maxBudget === 50000 && styles.budgetPresetTextActive
                      ]}>5K+</Text>
                    </Pressable>
                  </View>

                  {/* Min Budget Slider */}
                  <View style={styles.sliderContainer}>
                    <View style={styles.sliderLabelRow}>
                      <Text style={styles.sliderLabel}>Minimum</Text>
                      <Text style={styles.sliderValue}>
                        {minBudget.toLocaleString('tr-TR')} TRY
                      </Text>
                    </View>
                    <Slider
                      value={minBudget}
                      minimumValue={0}
                      maximumValue={50000}
                      step={500}
                      onValueChange={(value) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setMinBudget(value);
                      }}
                      minimumTrackTintColor={colors.primary}
                      maximumTrackTintColor={colors.border}
                      thumbTintColor={colors.primary}
                      style={styles.slider}
                      accessibilityRole="adjustable"
                      accessibilityLabel="Minimum bütçe"
                      accessibilityValue={{ min: 0, max: 50000, now: minBudget }}
                    />
                    <View style={styles.sliderMinMax}>
                      <Text style={styles.sliderMinMaxText}>0</Text>
                      <Text style={styles.sliderMinMaxText}>50,000</Text>
                    </View>
                  </View>

                  {/* Max Budget Slider */}
                  <View style={styles.sliderContainer}>
                    <View style={styles.sliderLabelRow}>
                      <Text style={styles.sliderLabel}>Maximum</Text>
                      <Text style={styles.sliderValue}>
                        {maxBudget.toLocaleString('tr-TR')} TRY
                      </Text>
                    </View>
                    <Slider
                      value={maxBudget}
                      minimumValue={0}
                      maximumValue={50000}
                      step={500}
                      onValueChange={(value) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setMaxBudget(value);
                      }}
                      minimumTrackTintColor={colors.primary}
                      maximumTrackTintColor={colors.border}
                      thumbTintColor={colors.primary}
                      style={styles.slider}
                      accessibilityRole="adjustable"
                      accessibilityLabel="Maximum bütçe"
                      accessibilityValue={{ min: 0, max: 50000, now: maxBudget }}
                    />
                    <View style={styles.sliderMinMax}>
                      <Text style={styles.sliderMinMaxText}>0</Text>
                      <Text style={styles.sliderMinMaxText}>50,000</Text>
                    </View>
                  </View>
                </View>

                {/* Location Radius Filter */}
                <View style={styles.filterSection}>
                  <View style={styles.sliderLabelRow}>
                    <Text style={styles.filterLabel}>Konum Yarıçapı</Text>
                    <Text style={styles.radiusDisplay}>
                      {radius} km
                    </Text>
                  </View>

                  <Slider
                    value={radius}
                    minimumValue={0}
                    maximumValue={100}
                    step={5}
                    onValueChange={(value) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setRadius(value);
                    }}
                    minimumTrackTintColor={colors.secondaryOrangeDark}
                    maximumTrackTintColor={colors.border}
                    thumbTintColor={colors.secondaryOrangeDark}
                    style={styles.slider}
                    accessibilityRole="adjustable"
                    accessibilityLabel="Konum yarıçapı"
                    accessibilityValue={{ min: 0, max: 100, now: radius }}
                  />
                  <View style={styles.sliderMinMax}>
                    <Text style={styles.sliderMinMaxText}>0 km</Text>
                    <Text style={styles.sliderMinMaxText}>100 km</Text>
                  </View>
                  <Text style={styles.helperText}>
                    <MaterialIcons name="info-outline" size={14} color={colors.textSecondary} />
                    {' '}Konum izni verildiyse, bu yarıçap içindeki ihtiyaçlar gösterilir
                  </Text>
                </View>

                {/* Urgency Filter */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Aciliyet</Text>
                  <View style={styles.urgencyContainer}>
                    {urgencyLevels.map((level) => {
                      const isSelected = localFilters.urgency === level.value;
                      const urgencyColor = getUrgencyColor(level.value);

                      return (
                        <UrgencyPill
                          key={level.value}
                          urgency={level.value}
                          label={level.label}
                          selected={isSelected}
                          urgencyColor={urgencyColor}
                          onPress={() => handleUrgencySelect(level.value)}
                        />
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.footer}>
                <Button
                  title="Temizle"
                  onPress={handleClear}
                  variant="outline"
                  style={styles.clearButton}
                  accessibilityLabel="Filtreleri temizle"
                  accessibilityHint="Tüm filtreleri kaldırmak için çift dokunun"
                />
                <LinearGradient
                  colors={colors.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.applyButtonGradient}
                >
                  <TouchableOpacity
                    onPress={handleApply}
                    style={styles.applyButton}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Filtreleri uygula"
                    accessibilityHint="Seçili filtreleri uygulamak için çift dokunun"
                  >
                    <Text style={styles.applyButtonText}>Uygula</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// CategoryChip Component
const CategoryChip: React.FC<{
  category: Category;
  selected: boolean;
  categoryColor: string;
  onPress: () => void;
}> = ({ category, selected, categoryColor, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.chipWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.chip,
          selected ? {
            backgroundColor: categoryColor,
            borderColor: categoryColor,
          } : {
            borderColor: categoryColor,
          }
        ]}
        accessibilityRole="checkbox"
        accessibilityLabel={category.nameTr}
        accessibilityState={{ checked: selected }}
        accessibilityHint={`${category.nameTr} kategorisini ${selected ? 'kaldırmak' : 'seçmek'} için çift dokunun`}
      >
        <Text style={[
          styles.chipText,
          selected && { color: colors.onPrimary }
        ]}>
          {category.nameTr}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

// UrgencyPill Component
const UrgencyPill: React.FC<{
  urgency: UrgencyType;
  label: string;
  selected: boolean;
  urgencyColor: string;
  onPress: () => void;
}> = ({ urgency, label, selected, urgencyColor, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.urgencyPillWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.urgencyPill,
          selected && {
            backgroundColor: urgencyColor,
            borderColor: urgencyColor,
          }
        ]}
        accessibilityRole="radio"
        accessibilityLabel={`Aciliyet: ${label}`}
        accessibilityState={{ checked: selected }}
      >
        <Text style={[
          styles.urgencyText,
          selected && { color: colors.onPrimary }
        ]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: MODAL_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  headerBadge: {
    backgroundColor: colors.secondaryOrangeDark,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  headerBadgeText: {
    color: colors.onOrangeDark,
    fontSize: 12,
    fontWeight: '700',
  },
  closeButton: {
    padding: spacing.sm,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  filterSection: {
    marginBottom: spacing.xl,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Category Chips
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipWrapper: {
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: colors.background,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // Budget Section
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  budgetDisplay: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  budgetPresets: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  budgetPreset: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  budgetPresetActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  budgetPresetText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  budgetPresetTextActive: {
    color: colors.primary,
  },

  // Sliders
  sliderContainer: {
    marginBottom: spacing.lg,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderMinMax: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sliderMinMaxText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  radiusDisplay: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondaryOrangeDark,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.md,
    lineHeight: 18,
  },

  // Urgency Pills
  urgencyContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  urgencyPillWrapper: {
    flex: 1,
  },
  urgencyPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  urgencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  clearButton: {
    flex: 1,
  },
  applyButtonGradient: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  applyButton: {
    width: '100%',
    height: '100%',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onPrimary,
  },
});

export default FilterModal;
