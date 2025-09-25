// Fallback for using MaterialIcons on Android and web.

import { MaterialIcons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.down': 'keyboard-arrow-down',
  'chevron.up': 'keyboard-arrow-up',
  'chevron.left': 'chevron-left',
  'plus': 'add',
  'minus': 'remove',
  'xmark': 'close',
  'checkmark': 'check',
  'house': 'home',
  'person': 'person',
  'gear': 'settings',
  'magnifyingglass': 'search',
} as IconMapping;

/**
 * An icon component that uses Material Icons across all platforms.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: string;
  size?: number;
  color: string;
  style?: StyleProp<TextStyle>;
  weight?: string;
}) {
  const iconName = MAPPING[name] || 'help-outline';
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
