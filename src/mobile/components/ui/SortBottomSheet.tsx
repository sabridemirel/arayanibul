import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from '../../theme';
import { SortBy } from '../../services/api';
import { ActiveSort } from './ResultsBar';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 340;

export interface SortOption {
  label: string;
  sortBy: SortBy;
  sortDescending: boolean;
  icon: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { label: 'En Yeni', sortBy: 'CreatedAt', sortDescending: true, icon: 'schedule' },
  { label: 'En Eski', sortBy: 'CreatedAt', sortDescending: false, icon: 'history' },
  { label: 'Bütçe: Yüksek → Düşük', sortBy: 'Budget', sortDescending: true, icon: 'trending-down' },
  { label: 'Bütçe: Düşük → Yüksek', sortBy: 'Budget', sortDescending: false, icon: 'trending-up' },
  { label: 'Aciliyet', sortBy: 'Urgency', sortDescending: true, icon: 'flash-on' },
];

interface SortBottomSheetProps {
  visible: boolean;
  activeSort: ActiveSort;
  onSelect: (option: SortOption) => void;
  onClose: () => void;
}

const SortBottomSheet: React.FC<SortBottomSheetProps> = ({
  visible,
  activeSort,
  onSelect,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 70,
          friction: 12,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_HEIGHT, 0],
  });

  const handleOptionPress = (option: SortOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(option);
    onClose();
  };

  const isActiveOption = (option: SortOption): boolean =>
    option.sortBy === activeSort.sortBy &&
    option.sortDescending === activeSort.sortDescending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY }], paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Sıralama</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsList}>
            {SORT_OPTIONS.map((option) => {
              const active = isActiveOption(option);
              return (
                <SortOptionRow
                  key={`${option.sortBy}-${option.sortDescending}`}
                  option={option}
                  active={active}
                  onPress={() => handleOptionPress(option)}
                />
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Individual row with animated radio button
const SortOptionRow: React.FC<{
  option: SortOption;
  active: boolean;
  onPress: () => void;
}> = ({ option, active, onPress }) => {
  const innerScale = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(innerScale, {
      toValue: active ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [active, innerScale]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        active && styles.optionRowActive,
        pressed && styles.optionRowPressed,
      ]}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={option.label}
    >
      <View style={styles.optionLeft}>
        <MaterialIcons
          name={option.icon as any}
          size={20}
          color={active ? colors.primary : colors.textSecondary}
          style={styles.optionIcon}
        />
        <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
          {option.label}
        </Text>
      </View>

      {/* Radio button */}
      <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
        <Animated.View
          style={[
            styles.radioInner,
            { transform: [{ scale: innerScale }] },
          ]}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: SHEET_HEIGHT,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsList: {
    paddingTop: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: 0,
  },
  optionRowActive: {
    backgroundColor: 'rgba(123, 44, 191, 0.06)',
  },
  optionRowPressed: {
    backgroundColor: 'rgba(123, 44, 191, 0.04)',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    marginRight: spacing.md,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text,
  },
  optionLabelActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});

export default SortBottomSheet;
