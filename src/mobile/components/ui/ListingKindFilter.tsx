// Kind filter above the listing list (same as the web home page): Tümü, Acil, Hemen alır.
// "Acil" and "Hemen alır" can both be on, which leaves urgent fixed-price listings.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme';

interface ListingKindFilterProps {
  urgentOnly: boolean;
  fixedOnly: boolean;
  onChange: (next: { urgentOnly: boolean; fixedOnly: boolean }) => void;
}

const Chip: React.FC<{ label: string; selected: boolean; onPress: () => void; icon?: boolean }> = ({
  label,
  selected,
  onPress,
  icon,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.chip, selected && styles.chipSelected]}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    accessibilityLabel={label}
    hitSlop={{ top: 4, bottom: 4 }}
  >
    {icon ? (
      <MaterialIcons name="local-fire-department" size={16} color={selected ? colors.onPrimary : colors.text} />
    ) : null}
    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

const ListingKindFilter: React.FC<ListingKindFilterProps> = ({ urgentOnly, fixedOnly, onChange }) => (
  <View style={styles.row} accessibilityLabel="İlan türü">
    <Chip
      label="Tümü"
      selected={!urgentOnly && !fixedOnly}
      onPress={() => onChange({ urgentOnly: false, fixedOnly: false })}
    />
    <Chip label="Acil" icon selected={urgentOnly} onPress={() => onChange({ urgentOnly: !urgentOnly, fixedOnly })} />
    <Chip
      label="Hemen alır"
      selected={fixedOnly}
      onPress={() => onChange({ urgentOnly, fixedOnly: !fixedOnly })}
    />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.text },
  chipTextSelected: { color: colors.onPrimary },
});

export default ListingKindFilter;
