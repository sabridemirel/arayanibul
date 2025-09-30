import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { NeedFilters, Category } from '../../types';
import Button from './Button';
import { getCategoryColor, getCategoryTextColor, getCategoryColorWithOpacity } from '../../utils/categoryUtils';

interface FilterModalProps {
  visible: boolean;
  filters: NeedFilters;
  categories: Category[];
  onApply: (filters: NeedFilters) => void;
  onClear: () => void;
  onClose: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  filters,
  categories,
  onApply,
  onClear,
  onClose,
}) => {
  const [slideAnim] = useState(new Animated.Value(0));
  const [localFilters, setLocalFilters] = useState<NeedFilters>(filters);

  // Urgency levels matching backend enum
  const urgencyLevels = [
    { label: 'Tümü', value: '' },
    { label: 'Esnek', value: 'Flexible' },
    { label: 'Normal', value: 'Normal' },
    { label: 'Acil', value: 'Urgent' },
  ];

  useEffect(() => {
    setLocalFilters(filters);
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
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters: NeedFilters = {};
    setLocalFilters(clearedFilters);
    onClear();
    onClose();
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  const opacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
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
                <Text style={styles.title}>Filtrele</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <MaterialIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
              >
                {/* Category Filter */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Kategori</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={localFilters.categoryId || ''}
                      onValueChange={(value) =>
                        setLocalFilters({
                          ...localFilters,
                          categoryId: value ? Number(value) : undefined,
                        })
                      }
                      style={styles.picker}
                    >
                      <Picker.Item label="Tüm Kategoriler" value="" />
                      {categories.map((category) => (
                        <Picker.Item
                          key={category.id}
                          label={category.nameTr}
                          value={category.id}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Budget Range Filter */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Bütçe Aralığı (TRY)</Text>
                  <View style={styles.rangeContainer}>
                    <View style={styles.rangeInputContainer}>
                      <Text style={styles.rangeInputLabel}>Min</Text>
                      <TextInput
                        style={styles.rangeInput}
                        placeholder="0"
                        keyboardType="numeric"
                        value={localFilters.minBudget?.toString() || ''}
                        onChangeText={(text) => {
                          const value = text ? parseInt(text, 10) : undefined;
                          setLocalFilters({
                            ...localFilters,
                            minBudget: value,
                          });
                        }}
                      />
                    </View>
                    <Text style={styles.rangeSeparator}>-</Text>
                    <View style={styles.rangeInputContainer}>
                      <Text style={styles.rangeInputLabel}>Max</Text>
                      <TextInput
                        style={styles.rangeInput}
                        placeholder="∞"
                        keyboardType="numeric"
                        value={localFilters.maxBudget?.toString() || ''}
                        onChangeText={(text) => {
                          const value = text ? parseInt(text, 10) : undefined;
                          setLocalFilters({
                            ...localFilters,
                            maxBudget: value,
                          });
                        }}
                      />
                    </View>
                  </View>
                </View>

                {/* Location Radius Filter */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>
                    Konum Yarıçapı (km)
                  </Text>
                  <View style={styles.inputContainer}>
                    <MaterialIcons
                      name="location-on"
                      size={20}
                      color={colors.textSecondary}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Örn: 10"
                      keyboardType="numeric"
                      value={localFilters.radius?.toString() || ''}
                      onChangeText={(text) => {
                        const value = text ? parseInt(text, 10) : undefined;
                        setLocalFilters({
                          ...localFilters,
                          radius: value,
                        });
                      }}
                    />
                  </View>
                  <Text style={styles.helperText}>
                    Konum izni verildiyse, bu yarıçap içindeki ihtiyaçlar gösterilir
                  </Text>
                </View>

                {/* Urgency Filter */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Aciliyet</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={localFilters.urgency || ''}
                      onValueChange={(value) =>
                        setLocalFilters({
                          ...localFilters,
                          urgency: value || undefined,
                        })
                      }
                      style={styles.picker}
                    >
                      {urgencyLevels.map((level) => (
                        <Picker.Item
                          key={level.value}
                          label={level.label}
                          value={level.value}
                        />
                      ))}
                    </Picker>
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
                />
                <Button
                  title="Uygula"
                  onPress={handleApply}
                  style={styles.applyButton}
                />
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
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
    borderTopLeftRadius: borderRadius.lg * 2,
    borderTopRightRadius: borderRadius.lg * 2,
    maxHeight: '80%',
    paddingBottom: spacing.xl,
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
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight as any,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  filterSection: {
    marginBottom: spacing.xl,
  },
  filterLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rangeInputContainer: {
    flex: 1,
  },
  rangeInputLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  rangeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.text,
    textAlign: 'center',
  },
  rangeSeparator: {
    marginHorizontal: spacing.md,
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.body.fontSize,
    color: colors.text,
  },
  helperText: {
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  clearButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
  },
});

export default FilterModal;