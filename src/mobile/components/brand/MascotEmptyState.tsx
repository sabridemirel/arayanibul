import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { fonts } from '../../theme/fonts';
import Button from '../ui/Button';

interface Props {
  title: string;
  message: string;
  actionTitle?: string;
  onAction?: () => void;
}

/** Empty screens show the mascot and a way forward instead of a grey icon. */
const MascotEmptyState: React.FC<Props> = ({ title, message, actionTitle, onAction }) => (
  <View style={styles.container}>
    <View style={styles.disc}>
      <Image
        source={require('../../assets/images/mascot.png')}
        style={styles.mascot}
        resizeMode="contain"
        accessible={false}
      />
    </View>
    <Text style={styles.title} accessibilityRole="header">{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {actionTitle && onAction ? (
      <Button title={actionTitle} onPress={onAction} style={styles.button} />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  disc: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.primaryExtraLight,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  mascot: {
    width: 104,
    height: 116,
    marginBottom: -8,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  button: {
    marginTop: spacing.lg,
    minWidth: 200,
  },
});

export default MascotEmptyState;
