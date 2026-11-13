import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Button from './ui/Button';
import { Need } from '../types';
import { colors, spacing, typography, borderRadius } from '../theme';
import { PENDING_REVIEW_HELP } from '../utils/needStatus';

interface NeedModerationNoticeProps {
  need: Pick<Need, 'status' | 'rejectionReasonText' | 'rejectionNote'>;
  // Shown for rejected needs: opens the edit screen so the owner can fix and resubmit
  onEdit?: () => void;
  compact?: boolean;
}

// Owner-only notice for needs that are in review or were not published
const NeedModerationNotice: React.FC<NeedModerationNoticeProps> = ({ need, onEdit, compact }) => {
  if (need.status === 'PendingReview') {
    return (
      <View style={[styles.box, styles.pendingBox]} accessibilityRole="text">
        <MaterialIcons name="hourglass-empty" size={18} color={colors.info} />
        <Text style={styles.text}>{PENDING_REVIEW_HELP}</Text>
      </View>
    );
  }

  if (need.status !== 'Rejected') return null;

  return (
    <View style={[styles.box, styles.rejectedBox]}>
      <MaterialIcons name="block" size={18} color={colors.error} />
      <View style={styles.body}>
        <Text style={styles.title}>İlanınız yayınlanmadı.</Text>
        {need.rejectionReasonText ? (
          <Text style={styles.text}>Neden: {need.rejectionReasonText}</Text>
        ) : null}
        {need.rejectionNote ? <Text style={styles.text}>Not: {need.rejectionNote}</Text> : null}
        <Text style={styles.text}>
          İlanınızı kurallara uygun şekilde düzenleyip tekrar incelemeye gönderebilirsiniz.
        </Text>
        {onEdit && !compact ? (
          <Button
            title="Düzenle ve Tekrar Gönder"
            onPress={onEdit}
            icon="edit"
            size="small"
            style={styles.button}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  pendingBox: {
    backgroundColor: colors.infoLight,
  },
  rejectedBox: {
    backgroundColor: colors.errorLight,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
    marginLeft: spacing.sm,
    marginBottom: spacing.xs,
  },
  text: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    marginLeft: spacing.sm,
    marginBottom: spacing.xs,
  },
  button: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
  },
});

export default NeedModerationNotice;
