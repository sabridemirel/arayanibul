import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNotificationPermissions } from '../hooks/useNotificationPermissions';
import { notificationAPI, NotificationSettings } from '../services/api';
import { Loading, ErrorMessage } from '../components/ui';

interface NotificationSettingsScreenProps {
  navigation: any;
}

const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const {
    granted,
    status,
    canAskAgain,
    isLoading: permissionLoading,
    requestPermissions,
    openSettings,
  } = useNotificationPermissions();

  const [settings, setSettings] = useState<NotificationSettings>({
    newOffers: true,
    offerAccepted: true,
    offerRejected: true,
    newMessages: true,
    needExpiring: true,
    marketingEmails: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setError(null);
      const userSettings = await notificationAPI.getSettings();
      setSettings(userSettings);
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      setError('Ayarlar yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    if (!granted && value) {
      // If trying to enable a notification but permissions not granted
      const permissionGranted = await requestPermissions();
      if (!permissionGranted) {
        Alert.alert(
          'Bildirim İzni Gerekli',
          'Bu özelliği kullanmak için bildirim izni vermeniz gerekiyor.',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Ayarlara Git', onPress: openSettings },
          ]
        );
        return;
      }
    }

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      setIsSaving(true);
      await notificationAPI.updateSettings({ [key]: value });
    } catch (error) {
      console.error('Failed to update setting:', error);
      // Revert the change
      setSettings(settings);
      Alert.alert('Hata', 'Ayar güncellenirken hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    const permissionGranted = await requestPermissions();
    if (!permissionGranted) {
      if (canAskAgain) {
        Alert.alert(
          'Bildirim İzni',
          'Bildirimleri almak için izin vermeniz gerekiyor.',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Tekrar Dene', onPress: handleEnableNotifications },
          ]
        );
      } else {
        Alert.alert(
          'Bildirim İzni',
          'Bildirimleri etkinleştirmek için cihaz ayarlarından izin vermeniz gerekiyor.',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Ayarlara Git', onPress: openSettings },
          ]
        );
      }
    }
  };

  const renderPermissionStatus = () => {
    if (permissionLoading) {
      return (
        <View style={[styles.permissionCard, { backgroundColor: theme.colors.surface }]}>
          <Loading text="İzin durumu kontrol ediliyor..." />
        </View>
      );
    }

    return (
      <View style={[styles.permissionCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.permissionHeader}>
          <MaterialIcons
            name={granted ? 'notifications-active' : 'notifications-off'}
            size={24}
            color={granted ? theme.colors.success : theme.colors.error}
          />
          <View style={styles.permissionTextContainer}>
            <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>
              Bildirim İzni
            </Text>
            <Text style={[styles.permissionStatus, { color: theme.colors.textSecondary }]}>
              {granted ? 'Etkin' : 'Devre Dışı'}
            </Text>
          </View>
        </View>
        {!granted && (
          <TouchableOpacity
            style={[styles.enableButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleEnableNotifications}
          >
            <Text style={styles.enableButtonText}>Etkinleştir</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSettingItem = (
    key: keyof NotificationSettings,
    title: string,
    description: string,
    icon: string
  ) => (
    <View style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.settingContent}>
        <MaterialIcons name={icon as any} size={24} color={theme.colors.primary} />
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
            {description}
          </Text>
        </View>
      </View>
      <Switch
        value={settings[key] && granted}
        onValueChange={(value) => updateSetting(key, value)}
        trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
        thumbColor={settings[key] && granted ? theme.colors.primary : theme.colors.textSecondary}
        disabled={!granted || isSaving}
      />
    </View>
  );

  if (isLoading) {
    return <Loading text="Ayarlar yükleniyor..." />;
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ErrorMessage message={error} onRetry={loadSettings} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderPermissionStatus()}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Teklif Bildirimleri
          </Text>
          {renderSettingItem(
            'newOffers',
            'Yeni Teklifler',
            'İhtiyaçlarınıza yeni teklif geldiğinde bildirim alın',
            'local-offer'
          )}
          {renderSettingItem(
            'offerAccepted',
            'Teklif Kabul Edildi',
            'Teklifiniz kabul edildiğinde bildirim alın',
            'check-circle'
          )}
          {renderSettingItem(
            'offerRejected',
            'Teklif Reddedildi',
            'Teklifiniz reddedildiğinde bildirim alın',
            'cancel'
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Mesaj Bildirimleri
          </Text>
          {renderSettingItem(
            'newMessages',
            'Yeni Mesajlar',
            'Size yeni mesaj geldiğinde bildirim alın',
            'message'
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            İhtiyaç Bildirimleri
          </Text>
          {renderSettingItem(
            'needExpiring',
            'İhtiyaç Süresi Doluyor',
            'İhtiyaçlarınızın süresi dolmadan önce hatırlatma alın',
            'schedule'
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Pazarlama
          </Text>
          {renderSettingItem(
            'marketingEmails',
            'Pazarlama E-postaları',
            'Özel teklifler ve güncellemeler hakkında e-posta alın',
            'email'
          )}
        </View>

        <View style={styles.infoSection}>
          <MaterialIcons name="info" size={20} color={theme.colors.info} />
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Bildirim ayarlarınızı istediğiniz zaman değiştirebilirsiniz. 
            Bazı önemli güvenlik bildirimleri bu ayarlardan bağımsız olarak gönderilir.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  permissionTextContainer: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  permissionStatus: {
    fontSize: 14,
  },
  enableButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  enableButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    margin: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default NotificationSettingsScreen;