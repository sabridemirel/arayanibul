import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../../theme';
import Button from './Button';

interface GuestAccessModalProps {
  visible: boolean;
  onClose: () => void;
  onContinueAsGuest: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

const GuestAccessModal: React.FC<GuestAccessModalProps> = ({
  visible,
  onClose,
  onContinueAsGuest,
  onLogin,
  onRegister,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <MaterialIcons 
                name="person-outline" 
                size={64} 
                color={colors.primary} 
                style={styles.icon}
              />
              <Text style={styles.title}>Misafir Erişimi</Text>
              <Text style={styles.subtitle}>
                Misafir olarak devam edebilirsiniz, ancak bazı özellikler sınırlı olacaktır.
              </Text>
            </View>

            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <MaterialIcons name="check" size={20} color={colors.success} />
                <Text style={styles.featureText}>İhtiyaçları görüntüleyebilirsiniz</Text>
              </View>
              
              <View style={styles.featureItem}>
                <MaterialIcons name="check" size={20} color={colors.success} />
                <Text style={styles.featureText}>Kategorileri keşfedebilirsiniz</Text>
              </View>
              
              <View style={styles.featureItem}>
                <MaterialIcons name="check" size={20} color={colors.success} />
                <Text style={styles.featureText}>Arama yapabilirsiniz</Text>
              </View>

              <View style={styles.featureItem}>
                <MaterialIcons name="close" size={20} color={colors.error} />
                <Text style={styles.featureText}>İhtiyaç oluşturamazsınız</Text>
              </View>
              
              <View style={styles.featureItem}>
                <MaterialIcons name="close" size={20} color={colors.error} />
                <Text style={styles.featureText}>Teklif veremezsiniz</Text>
              </View>
              
              <View style={styles.featureItem}>
                <MaterialIcons name="close" size={20} color={colors.error} />
                <Text style={styles.featureText}>Mesajlaşamazsınız</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <Button
                title="Misafir Olarak Devam Et"
                onPress={onContinueAsGuest}
                variant="outline"
                fullWidth
                style={styles.guestButton}
              />
              
              <Button
                title="Giriş Yap"
                onPress={onLogin}
                fullWidth
                style={styles.loginButton}
              />
              
              <Button
                title="Kayıt Ol"
                onPress={onRegister}
                variant="secondary"
                fullWidth
                style={styles.registerButton}
              />
            </View>

            <Text style={styles.note}>
              İstediğiniz zaman hesap oluşturarak tüm özelliklere erişebilirsiniz.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '90%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: spacing.md,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight as any,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresList: {
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  actions: {
    marginBottom: spacing.lg,
  },
  guestButton: {
    marginBottom: spacing.md,
  },
  loginButton: {
    marginBottom: spacing.md,
  },
  registerButton: {
    marginBottom: spacing.md,
  },
  note: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default GuestAccessModal;