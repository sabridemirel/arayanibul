import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from './ui/Button';
import { reportAPI, ReportReason, ReportTargetType } from '../services/api';
import { colors, spacing, typography, borderRadius } from '../theme';

const REASONS: { key: ReportReason; label: string }[] = [
  { key: 'Spam', label: 'Spam veya reklam' },
  { key: 'Inappropriate', label: 'Uygunsuz içerik' },
  { key: 'Fraud', label: 'Dolandırıcılık şüphesi' },
  { key: 'Harassment', label: 'Taciz veya hakaret' },
  { key: 'Other', label: 'Diğer' },
];

const NOTE_MAX_LENGTH = 500;

const TITLES: Record<ReportTargetType, string> = {
  Need: 'İlanı Şikayet Et',
  Message: 'Mesajı Şikayet Et',
  User: 'Kullanıcıyı Şikayet Et',
};

interface ReportSheetProps {
  visible: boolean;
  targetType: ReportTargetType;
  targetId: string | number | null | undefined;
  onClose: () => void;
}

const ReportSheet: React.FC<ReportSheetProps> = ({ visible, targetType, targetId, onClose }) => {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Start fresh every time the sheet opens
  useEffect(() => {
    if (visible) {
      setReason(null);
      setNote('');
      setSubmitting(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!reason || targetId == null || submitting) return;
    try {
      setSubmitting(true);
      const trimmed = note.trim();
      const res = await reportAPI.createReport({
        targetType,
        targetId: String(targetId),
        reason,
        ...(trimmed ? { note: trimmed } : {}),
      });
      onClose();
      Alert.alert('Şikayetiniz Alındı', res?.message || 'Şikayetiniz incelenmek üzere ekibimize iletildi.');
    } catch (err: any) {
      const message = err?.response?.data?.message;
      Alert.alert(
        'Şikayet Gönderilemedi',
        typeof message === 'string' && message
          ? message
          : 'İnternet bağlantınızı kontrol edip tekrar deneyin.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={onClose} accessibilityLabel="Kapat">
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{TITLES[targetType]}</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.subtitle}>Şikayet nedeninizi seçin.</Text>

            {REASONS.map(item => {
              const selected = reason === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={styles.reasonRow}
                  onPress={() => setReason(item.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={item.label}
                >
                  <MaterialIcons
                    name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={22}
                    color={selected ? colors.primary : colors.textSecondary}
                  />
                  <Text style={styles.reasonText}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.noteLabel}>Açıklama (isteğe bağlı)</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Eklemek istediğiniz bir ayrıntı varsa yazın."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={NOTE_MAX_LENGTH}
              textAlignVertical="top"
            />

            <Button
              title="Şikayet Et"
              onPress={handleSubmit}
              loading={submitting}
              disabled={!reason || submitting}
              variant="danger"
              icon="flag"
              fullWidth
              style={styles.submit}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight as any,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  reasonText: {
    fontSize: typography.body.fontSize,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  noteInput: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.body.fontSize,
    color: colors.text,
  },
  submit: {
    marginTop: spacing.lg,
  },
});

export default ReportSheet;
