import { MaterialIcons } from '@expo/vector-icons';
import { StyleProp, ViewStyle } from 'react-native';

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: string;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: string;
}) {
  // Map common symbol names to MaterialIcons
  const getIconName = (symbolName: string): keyof typeof MaterialIcons.glyphMap => {
    const iconMap: Record<string, keyof typeof MaterialIcons.glyphMap> = {
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
      'heart': 'favorite',
      'star': 'star',
      'bell': 'notifications',
      'envelope': 'email',
      'phone': 'phone',
      'camera': 'camera-alt',
      'photo': 'photo',
      'location': 'location-on',
      'clock': 'access-time',
      'calendar': 'event',
      'folder': 'folder',
      'document': 'description',
      'trash': 'delete',
      'pencil': 'edit',
      'share': 'share',
      'bookmark': 'bookmark',
      'tag': 'label',
      'flag': 'flag',
      'lock': 'lock',
      'unlock': 'lock-open',
      'eye': 'visibility',
      'eye.slash': 'visibility-off',
      'arrow.right': 'arrow-forward',
      'arrow.left': 'arrow-back',
      'arrow.up': 'arrow-upward',
      'arrow.down': 'arrow-downward',
    };
    
    return iconMap[symbolName] || 'help-outline';
  };

  return (
    <MaterialIcons
      name={getIconName(name)}
      size={size}
      color={color}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
