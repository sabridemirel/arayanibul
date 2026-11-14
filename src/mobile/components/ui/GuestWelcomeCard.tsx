import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';
import { fonts } from '../../theme/fonts';
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
          <Image
            source={require('../../assets/images/mascot.png')}
            style={styles.mascot}
            resizeMode="contain"
            accessible={false}
          />
        </View>
        <Text style={styles.title}>Arayanibul'a Hoş Geldiniz!</Text>
      </View>
      
      <Text style={styles.description}>
        İhtiyacınızı yazın, satıcılar size teklif versin. Misafir olarak ilanlara göz atabilirsiniz.
      </Text>
      
      <View style={styles.features}>
        <View style={styles.featureItem}>
          <MaterialIcons name="search" size={20} color={colors.success} />
          <Text style={styles.featureText}>İlanlara göz atın</Text>
        </View>
        <View style={styles.featureItem}>
          <MaterialIcons name="local-offer" size={20} color={colors.success} />
          <Text style={styles.featureText}>Üye olup ücretsiz ilan verin</Text>
        </View>
        <View style={styles.featureItem}>
          <MaterialIcons name="chat" size={20} color={colors.success} />
          <Text style={styles.featureText}>Teklif alın, satıcılarla mesajlaşın</Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <Button
          title="Hemen Başlayın"
          onPress={onGetStarted}
          style={styles.getStartedButton}
        />
        
        <Text style={styles.guestNote}>
          Misafir olarak yalnızca ilanları görüntüleyebilirsiniz. İlan ve teklif vermek için üye olun.
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
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.secondaryOrange,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  mascot: {
    width: 72,
    height: 90,
    marginBottom: -10,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: typography.h2.fontSize,
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