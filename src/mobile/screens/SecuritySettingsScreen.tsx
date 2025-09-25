import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import authService from '../services/authService';
import biometricAuthService from '../services/biometricAuthService';
import secureStorageService from '../services/secureStorageService';

interface SecuritySettings {
  biometricEnabled: boolean;
  autoLockEnabled: boolean;
  autoLockTimeout: number; // in minutes
  secureStorageEnabled: boolean;
  certificatePinningEnabled: boolean;
}

const SecuritySettingsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SecuritySettings>({
    biometricEnabled: false,
    autoLockEnabled: false,
    autoLockTimeout: 5,
    secureStorageEnabled: true,
    certificatePinningEnabled: true,
  });
  const [biometricCapabilities, setBiometricCapabilities] = useState<any>(null);
  const [processingBiometric, setProcessingBiometric] = useState(false);

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      setLoading(true);

      // Load biometric capabilities
      const capabilities = await authService.getBiometricCapabilities();
      setBiometricCapabilities(capabilities);

      // Load current settings
      const biometricEnabled = await authService.isBiometricEnabled();
      const autoLockEnabled = await secureStorageService.getEncryptedItem('autoLockEnabled') === 'true';
      const autoLockTimeout = parseInt(await secureStorageService.getEncryptedItem('autoLockTimeout') || '5');

      setSettings({
        biometricEnabled,
        autoLockEnabled,
        autoLockTimeout,
        secureStorageEnabled: true, // Always enabled
        certificatePinningEnabled: true, // Always enabled in production
      });
    } catch (error) {
      console.error('Error loading security settings:', error);
      Alert.alert('Hata', 'Güvenlik ayarları yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (processingBiometric) return;

    try {
      setProcessingBiometric(true);

      if (enabled) {
        // Enable biometric authentication
        const result = await authService.enableBiometricAuth();
        if (result.success) {
          setSettings(prev => ({ ...prev, biometricEnabled: true }));
          Alert.alert('Başarılı', 'Biyometrik kimlik doğrulama etkinleştirildi.');
        } else {
          Alert.alert('Hata', result.error || 'Biyometrik kimlik doğrulama etkinleştirilemedi.');
        }
      } else {
        // Disable biometric authentication
        Alert.alert(
          'Biyometrik Kimlik Doğrulamayı Kapat',
          'Biyometrik kimlik doğrulamayı kapatmak istediğinizden emin misiniz?',
          [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Kapat',
              style: 'destructive',
              onPress: async () => {
                await biometricAuthService.disableBiometricAuth();
                setSettings(prev => ({ ...prev, biometricEnabled: false }));
                Alert.alert('Başarılı', 'Biyometrik kimlik doğrulama kapatıldı.');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error toggling biometric auth:', error);
      Alert.alert('Hata', 'Biyometrik kimlik doğrulama ayarı değiştirilemedi.');
    } finally {
      setProcessingBiometric(false);
    }
  };

  const handleAutoLockToggle = async (enabled: boolean) => {
    try {
      await secureStorageService.setEncryptedItem('autoLockEnabled', enabled.toString());
      setSettings(prev => ({ ...prev, autoLockEnabled: enabled }));
    } catch (error) {
      console.error('Error toggling auto lock:', error);
      Alert.alert('Hata', 'Otomatik kilit ayarı değiştirilemedi.');
    }
  };

  const handleAutoLockTimeoutChange = () => {
    const timeoutOptions = [
      { label: '1 dakika', value: 1 },
      { label: '5 dakika', value: 5 },
      { label: '10 dakika', value: 10 },
      { label: '30 dakika', value: 30 },
      { label: '1 saat', value: 60 },
    ];

    Alert.alert(
      'Otomatik Kilit Süresi',
      'Uygulama ne kadar süre sonra otomatik olarak kilitlensin?',
      timeoutOptions.map(option => ({
        text: option.label,
        onPress: async () => {
          try {
            await secureStorageService.setEncryptedItem('autoLockTimeout', option.value.toString());
            setSettings(prev => ({ ...prev, autoLockTimeout: option.value }));
          } catch (error) {
            console.error('Error setting auto lock timeout:', error);
          }
        },
      }))
    );
  };

  const testBiometricAuth = async () => {
    try {
      const result = await authService.authenticateWithBiometrics();
      if (result.success) {
        Alert.alert('Başarılı', 'Biyometrik kimlik doğrulama başarılı!');
      } else {
        Alert.alert('Başarısız', result.error || 'Biyometrik kimlik doğrulama başarısız.');
      }
    } catch (error) {
      Alert.alert('Hata', 'Biyometrik kimlik doğrulama test edilemedi.');
    }
  };

  const clearSecureData = () => {
    Alert.alert(
      'Güvenli Verileri Temizle',
      'Tüm güvenli veriler silinecek ve yeniden giriş yapmanız gerekecek. Devam etmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            try {
              await secureStorageService.clearAllSecureData();
              await authService.logout();
              Alert.alert('Başarılı', 'Güvenli veriler temizlendi. Lütfen tekrar giriş yapın.');
            } catch (error) {
              Alert.alert('Hata', 'Güvenli veriler temizlenirken hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const getBiometricTypeText = () => {
    if (!biometricCapabilities?.supportedTypes?.length) {
      return 'Desteklenmiyor';
    }

    const types = biometricAuthService.getBiometricTypeNames(biometricCapabilities.supportedTypes);
    return types.join(', ');
  };

  const getAutoLockTimeoutText = () => {
    const timeout = settings.autoLockTimeout;
    if (timeout < 60) {
      return `${timeout} dakika`;
    } else {
      return `${timeout / 60} saat`;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Güvenlik ayarları yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Biometric Authentication Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Biyometrik Kimlik Doğrulama
          </Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Biyometrik Giriş
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {getBiometricTypeText()} ile hızlı giriş
              </Text>
            </View>
            <Switch
              value={settings.biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={!biometricCapabilities?.isAvailable || !biometricCapabilities?.isEnrolled || processingBiometric}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {settings.biometricEnabled && (
            <TouchableOpacity style={styles.testButton} onPress={testBiometricAuth}>
              <Ionicons name="finger-print" size={20} color={colors.primary} />
              <Text style={[styles.testButtonText, { color: colors.primary }]}>
                Biyometrik Kimlik Doğrulamayı Test Et
              </Text>
            </TouchableOpacity>
          )}

          {!biometricCapabilities?.isAvailable && (
            <Text style={[styles.warningText, { color: colors.error }]}>
              Bu cihazda biyometrik kimlik doğrulama desteklenmiyor.
            </Text>
          )}

          {biometricCapabilities?.isAvailable && !biometricCapabilities?.isEnrolled && (
            <Text style={[styles.warningText, { color: colors.warning }]}>
              Biyometrik kimlik doğrulama ayarlanmamış. Cihaz ayarlarından etkinleştirin.
            </Text>
          )}
        </View>

        {/* Auto Lock Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Otomatik Kilit
          </Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Otomatik Kilit
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Uygulama belirli süre sonra otomatik kilitlenir
              </Text>
            </View>
            <Switch
              value={settings.autoLockEnabled}
              onValueChange={handleAutoLockToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {settings.autoLockEnabled && (
            <TouchableOpacity style={styles.settingItem} onPress={handleAutoLockTimeoutChange}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Kilit Süresi
                </Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  {getAutoLockTimeoutText()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Security Features Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Güvenlik Özellikleri
          </Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Güvenli Depolama
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Hassas veriler şifreli olarak saklanır
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={[styles.statusText, { color: colors.success }]}>Aktif</Text>
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Sertifika Sabitleme
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                API bağlantıları güvenli sertifikalarla korunur
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={[styles.statusText, { color: colors.success }]}>Aktif</Text>
            </View>
          </View>
        </View>

        {/* Advanced Section */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Gelişmiş
          </Text>
          
          <TouchableOpacity style={styles.dangerButton} onPress={clearSecureData}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
            <Text style={[styles.dangerButtonText, { color: colors.error }]}>
              Güvenli Verileri Temizle
            </Text>
          </TouchableOpacity>
        </View>

        {/* Security Info */}
        <View style={[styles.infoSection, { backgroundColor: colors.surface }]}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Arayanibul, verilerinizi korumak için en son güvenlik teknolojilerini kullanır. 
            Tüm hassas bilgiler şifreli olarak saklanır ve güvenli kanallar üzerinden iletilir.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  testButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  dangerButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  warningText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default SecuritySettingsScreen;