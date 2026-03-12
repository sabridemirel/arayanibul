import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';
import { SortBy } from '../../services/api';

export interface ActiveSort {
  label: string;
  sortBy: SortBy;
  sortDescending: boolean;
}

interface ResultsBarProps {
  totalCount: number | null;
  loading: boolean;
  activeSort: ActiveSort;
  hasActiveFilters: boolean;
  onSortPress: () => void;
}

const ResultsBar: React.FC<ResultsBarProps> = ({
  totalCount,
  loading,
  activeSort,
  hasActiveFilters,
  onSortPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Left: result count */}
      <View style={styles.leftSection}>
        {loading ? (
          <View style={styles.skeleton} />
        ) : (
          <Text style={styles.countText} numberOfLines={1}>
            {totalCount !== null ? (
              <>
                <Text style={styles.countNumber}>{totalCount.toLocaleString('tr-TR')}</Text>
                <Text style={styles.countSuffix}> sonuç bulundu</Text>
              </>
            ) : (
              <Text style={styles.countSuffix}>Sonuçlar</Text>
            )}
          </Text>
        )}
        {hasActiveFilters && (
          <View style={styles.filterActiveDot} />
        )}
      </View>

      {/* Right: sort pill */}
      <TouchableOpacity
        onPress={onSortPress}
        style={styles.sortPill}
        accessibilityRole="button"
        accessibilityLabel={`Sıralama: ${activeSort.label}`}
        accessibilityHint="Sıralama seçeneklerini açmak için dokunun"
        activeOpacity={0.75}
      >
        <MaterialIcons name="sort" size={14} color={colors.onPrimary} style={styles.sortIcon} />
        <Text style={styles.sortLabel} numberOfLines={1}>{activeSort.label}</Text>
        <MaterialIcons name="keyboard-arrow-down" size={14} color={colors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  countText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  countNumber: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 13,
  },
  countSuffix: {
    fontWeight: '400',
    color: colors.textSecondary,
    fontSize: 13,
  },
  skeleton: {
    width: 100,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.border,
  },
  filterActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondaryOrangeDark,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 160,
  },
  sortIcon: {
    marginRight: 2,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onPrimary,
    flexShrink: 1,
  },
});

export default ResultsBar;
