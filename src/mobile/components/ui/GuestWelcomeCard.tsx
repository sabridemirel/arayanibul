import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import Button from './Button';
import Card from './Card';

interface GuestWelcomeCardProps {
  onGetStarted: () => void;
  onDismiss?: () => void;
}

const GuestWelcomeCard: React.FC<GuestWelcomeCardProps> = ({
  onGetStarted,
  onDismiss,
}) => {
  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="waving-hand" size={32} color={colors.primary} />
        </View>
        <Text style={styles.title}>Arayanibul'a Hoş Geldiniz!</Text>
      </View>
      
      <Text style={styles.description}>
        İhtiyaçlarınızı paylaşın, en iyi teklifleri alın. 
        Binlerce kullanıcı zaten ihtiyaçlarını karşılıyor.
      </Text>
      
      <View style={styles.features}>
        <View style={styles.featureItem}>
          <MaterialIcons name="search" size={20} color={colors.success} />
          <Text style={styles.featureText}>İhtiyaçları keşfedin</Text>
        </View>
        <View style={styles.featureItem}>
          <MaterialIcons name="local-offer" size={20} color={colors.success} />
          <Text style={styles.featureText}>Teklifler görüntüleyin</Text>
        </View>
        <View style={styles.featureItem}>
          <MaterialIcons name="people" size={20} color={colors.success} />
          <Text style={styles.featureText}>Güvenilir kullanıcılar</Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <Button
          title="Hemen Başlayın"
          onPress={onGetStarted}
          style={styles.getStartedButton}
        />
        
        <Text style={styles.guestNote}>
          Misafir olarak gezmeye devam edebilir, istediğiniz zaman üye olabilirsiniz
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight as any,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  features: {
    marginBottom: spacing.lg,
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
  },
  actions: {
    alignItems: 'center',
  },
  getStartedButton: {
    width: '100%',
    marginBottom: spacing.md,
  },
  guestNote: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default GuestWelcomeCard;