import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';

interface PriceModeSelectorProps {
  isFixedPrice: boolean;
  onChange: (isFixedPrice: boolean) => void;
}

const MODES = [
  {
    fixed: true,
    title: 'Bu fiyata hemen alırım',
    text: 'Fiyatınızı yazın. Satıcılar yalnızca bu fiyata “bende var” diyebilir.',
  },
  {
    fixed: false,
    title: 'Tekliflere açığım',
    text: 'Fiyat yazmayın; satıcılar kendi fiyatlarıyla teklif versin, en uygununu siz seçin.',
  },
] as const;

/** The listing type: one firm price ("hemen alırım"), or no price and offers from sellers. */
const PriceModeSelector: React.FC<PriceModeSelectorProps> = ({ isFixedPrice, onChange }) => (
  <View accessibilityRole="radiogroup" accessibilityLabel="İlan türü">
    {MODES.map((mode) => {
      const selected = mode.fixed === isFixedPrice;
      return (
        <TouchableOpacity
          key={mode.title}
          onPress={() => onChange(mode.fixed)}
          style={[styles.option, selected && styles.optionSelected]}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected }}
          accessibilityLabel={`${mode.title}. ${mode.text}`}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
            size={22}
            color={selected ? colors.primary : colors.textSecondary}
            style={styles.icon}
          />
          <View style={styles.texts}>
            <Text style={styles.title}>{mode.title}</Text>
            <Text style={styles.text}>{mode.text}</Text>
          </View>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  option: {
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
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  icon: { marginTop: 1, marginRight: spacing.sm },
  texts: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  text: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
});

export default PriceModeSelector;
