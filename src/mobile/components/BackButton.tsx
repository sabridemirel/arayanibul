import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../theme';

interface BackButtonProps {
  color?: string;
}

/**
 * Top-left back arrow for screens without a native header. iOS has no system back button, so
 * every sub-page needs one; when there is nothing to go back to it opens the home screen.
 */
const BackButton: React.FC<BackButtonProps> = ({ color = colors.text }) => {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
      style={styles.button}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Geri"
    >
      <MaterialIcons name="arrow-back" size={24} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: { padding: spacing.xs, marginRight: spacing.sm, marginLeft: -spacing.xs },
});

export default BackButton;
