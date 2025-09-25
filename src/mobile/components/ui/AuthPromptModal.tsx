import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import Button from './Button';

export type AuthPromptContext = 
  | 'create_need' 
  | 'make_offer' 
  | 'send_message' 
  | 'view_profile'
  | 'save_favorite'
  | 'view_conversations'
  | 'edit_profile';

interface AuthPromptModalProps {
  visible: boolean;
  context: AuthPromptContext;
  onLogin: () => void;
  onRegister: () => void;
  onDismiss: () => void;
}

interface PromptConfig {
  icon: string;
  title: string;
  message: string;
  benefits: string[];
  primaryAction: string;
  secondaryAction: string;
}

const promptConfigs: Record<AuthPromptContext, PromptConfig> = {
  create_need: {
    icon: 'add-circle-outline',
    title: 'İhtiyaç Oluştur',
    message: 'İhtiyaçlarınızı paylaşın ve en iyi teklifleri alın',
    benefits: [
      'Ücretsiz ihtiyaç paylaşımı',
      'Birden fazla teklif alın',
      'Güvenli mesajlaşma',
      'Değerlendirme sistemi'
    ],
    primaryAction: 'Kayıt Ol',
    secondaryAction: 'Giriş Yap'
  },
  make_offer: {
    icon: 'local-offer',
    title: 'Teklif Ver',
    message: 'Uzmanlığınızı paylaşın ve para kazanın',
    benefits: [
      'İstediğiniz fiyatı belirleyin',
      'Müşterilerle direkt iletişim',
      'Güvenli ödeme sistemi',
      'Profil puanlama sistemi'
    ],
    primaryAction: 'Kayıt Ol',
    secondaryAction: 'Giriş Yap'
  },
  send_message: {
    icon: 'message',
    title: 'Mesajlaşma',
    message: 'Güvenli mesajlaşma ile detayları konuşun',
    benefits: [
      'Anlık mesajlaşma',
      'Fotoğraf paylaşımı',
      'Konum paylaşımı',
      'Mesaj geçmişi'
    ],
    primaryAction: 'Kayıt Ol',
    secondaryAction: 'Giriş Yap'
  },
  view_profile: {
    icon: 'person',
    title: 'Profil Görüntüle',
    message: 'Kişiselleştirilmiş deneyim için giriş yapın',
    benefits: [
      'Kişisel profil sayfası',
      'İşlem geçmişi',
      'Favoriler listesi',
      'Bildirim ayarları'
    ],
    primaryAction: 'Kayıt Ol',
    secondaryAction: 'Giriş Yap'
  },
  save_favorite: {
    icon: 'favorite-border',
    title: 'Favorilere Ekle',
    message: 'Beğendiğiniz ihtiyaçları kaydedin',
    benefits: [
      'Favoriler listesi',
      'Hızlı erişim',
      'Durum bildirimleri',
      'Kişisel öneriler'
    ],
    primaryAction: 'Kayıt Ol',
    secondaryAction: 'Giriş Yap'
  },
  view_conversations: {
    icon: 'chat',
    title: 'Konuşmalar',
    message: 'Tüm mesajlarınızı tek yerden yönetin',
    benefits: [
      'Tüm konuşmalar',
      'Okunmamış mesajlar',
      'Arama özelliği',
      'Arşiv sistemi'
    ],
    primaryAction: 'Kayıt Ol',
    secondaryAction: 'Giriş Yap'
  },
  edit_profile: {
    icon: 'edit',
    title: 'Profil Düzenle',
    message: 'Profilinizi kişiselleştirin',
    benefits: [
      'Profil fotoğrafı',
      'Kişisel bilgiler',
      'Uzmanlık alanları',
      'İletişim tercihleri'
    ],
    primaryAction: 'Kayıt Ol',
    secondaryAction: 'Giriş Yap'
  }
};

const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  visible,
  context,
  onLogin,
  onRegister,
  onDismiss,
}) => {
  const config = promptConfigs[context];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close button */}
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <MaterialIcons 
              name={config.icon as any} 
              size={48} 
              color={colors.primary} 
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>{config.title}</Text>

          {/* Message */}
          <Text style={styles.message}>{config.message}</Text>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            {config.benefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <MaterialIcons 
                  name="check-circle" 
                  size={16} 
                  color={colors.success} 
                />
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <Button
              title={config.primaryAction}
              onPress={onRegister}
              style={styles.primaryButton}
            />
            <Button
              title={config.secondaryAction}
              onPress={onLogin}
              variant="outline"
              style={styles.secondaryButton}
            />
          </View>

          {/* Social proof */}
          <Text style={styles.socialProof}>
            1000+ kullanıcı Arayanibul'da ihtiyaçlarını karşılıyor
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    width: Math.min(screenWidth - 40, 400),
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.sm,
    zIndex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight as any,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  benefitsContainer: {
    marginBottom: spacing.xl,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  benefitText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  actionButtons: {
    marginBottom: spacing.lg,
  },
  primaryButton: {
    marginBottom: spacing.md,
  },
  secondaryButton: {
    // No additional styles needed
  },
  socialProof: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default AuthPromptModal;