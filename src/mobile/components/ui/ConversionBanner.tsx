import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import Button from './Button';

export type ConversionBannerType = 
  | 'soft_prompt' 
  | 'feature_highlight' 
  | 'social_proof'
  | 'scroll_prompt';

interface ConversionBannerProps {
  type: ConversionBannerType;
  viewCount?: number;
  onAuthAction: () => void;
  onDismiss: () => void;
  style?: any;
}

interface BannerConfig {
  icon: string;
  title: string;
  message: string;
  actionText: string;
  backgroundColor: string;
  textColor: string;
}

const getBannerConfig = (type: ConversionBannerType, viewCount = 0): BannerConfig => {
  switch (type) {
    case 'soft_prompt':
      return {
        icon: 'star',
        title: 'Arayanibul\'u Beğendiniz mi?',
        message: `${viewCount} ihtiyaç görüntülediniz. Üye olarak daha fazla özellik keşfedin!`,
        actionText: 'Üye Ol',
        backgroundColor: colors.primaryLight,
        textColor: colors.primary,
      };
    
    case 'feature_highlight':
      return {
        icon: 'featured-play-list',
        title: 'Daha Fazla Özellik',
        message: 'Favoriler, bildirimler ve kişisel öneriler için üye olun',
        actionText: 'Keşfet',
        backgroundColor: colors.success + '20',
        textColor: colors.success,
      };
    
    case 'social_proof':
      return {
        icon: 'people',
        title: '1000+ Kullanıcı',
        message: 'Arayanibul\'da ihtiyaçlarını karşılıyor. Siz de katılın!',
        actionText: 'Katıl',
        backgroundColor: colors.warning + '20',
        textColor: colors.warning,
      };
    
    case 'scroll_prompt':
      return {
        icon: 'trending-up',
        title: 'Daha Fazlası İçin',
        message: 'Üye olun ve sınırsız ihtiyaç görüntüleyin',
        actionText: 'Üye Ol',
        backgroundColor: colors.secondary + '20',
        textColor: colors.secondary,
      };
    
    default:
      return {
        icon: 'info',
        title: 'Arayanibul',
        message: 'Daha iyi deneyim için üye olun',
        actionText: 'Üye Ol',
        backgroundColor: colors.primaryLight,
        textColor: colors.primary,
      };
  }
};

const ConversionBanner: React.FC<ConversionBannerProps> = ({
  type,
  viewCount = 0,
  onAuthAction,
  onDismiss,
  style,
}) => {
  const config = getBannerConfig(type, viewCount);

  return (
    <View style={[styles.container, { backgroundColor: config.backgroundColor }, style]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons 
            name={config.icon as any} 
            size={24} 
            color={config.textColor} 
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: config.textColor }]}>
            {config.title}
          </Text>
          <Text style={[styles.message, { color: config.textColor }]}>
            {config.message}
          </Text>
        </View>
        
        <View style={styles.actions}>
          <Button
            title={config.actionText}
            onPress={onAuthAction}
            size="small"
            style={[styles.actionButton, { backgroundColor: config.textColor }]}
          />
          
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.dismissButton}
          >
            <MaterialIcons 
              name="close" 
              size={20} 
              color={config.textColor} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: 14,
    lineHeight: 18,
  },
  actions: {
    alignItems: 'center',
  },
  actionButton: {
    minWidth: 70,
    marginBottom: spacing.sm,
  },
  dismissButton: {
    padding: spacing.xs,
  },
});

export default ConversionBanner;