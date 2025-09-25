import * as LocalAuthentication from 'expo-local-authentication';
import secureStorageService from './secureStorageService';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: LocalAuthentication.AuthenticationType[];
}

export interface BiometricCapabilities {
  isAvailable: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  isEnrolled: boolean;
  securityLevel: LocalAuthentication.SecurityLevel;
}

class BiometricAuthService {
  private readonly BIOMETRIC_KEY = 'biometricEnabled';
  private readonly BIOMETRIC_TOKEN_KEY = 'biometricToken';

  /**
   * Check if biometric authentication is available and configured
   */
  async getBiometricCapabilities(): Promise<BiometricCapabilities> {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

      return {
        isAvailable,
        supportedTypes,
        isEnrolled,
        securityLevel,
      };
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      return {
        isAvailable: false,
        supportedTypes: [],
        isEnrolled: false,
        securityLevel: LocalAuthentication.SecurityLevel.NONE,
      };
    }
  }

  /**
   * Check if biometric authentication is enabled for the app
   */
  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await secureStorageService.getEncryptedItem(this.BIOMETRIC_KEY);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  /**
   * Enable biometric authentication for the app
   */
  async enableBiometricAuth(authToken: string): Promise<BiometricAuthResult> {
    try {
      const capabilities = await this.getBiometricCapabilities();
      
      if (!capabilities.isAvailable) {
        return {
          success: false,
          error: 'Biyometrik kimlik doğrulama bu cihazda desteklenmiyor.',
        };
      }

      if (!capabilities.isEnrolled) {
        return {
          success: false,
          error: 'Biyometrik kimlik doğrulama ayarlanmamış. Lütfen cihaz ayarlarından biyometrik kimlik doğrulamayı etkinleştirin.',
        };
      }

      // Test biometric authentication
      const authResult = await this.authenticateWithBiometrics('Biyometrik kimlik doğrulamayı etkinleştirmek için doğrulayın');
      
      if (!authResult.success) {
        return authResult;
      }

      // Store the auth token securely with biometric protection
      await secureStorageService.setSecureItem(
        this.BIOMETRIC_TOKEN_KEY, 
        authToken, 
        { requireAuthentication: true }
      );

      // Mark biometric as enabled
      await secureStorageService.setEncryptedItem(this.BIOMETRIC_KEY, 'true');

      return {
        success: true,
        biometricType: capabilities.supportedTypes,
      };
    } catch (error) {
      console.error('Error enabling biometric auth:', error);
      return {
        success: false,
        error: 'Biyometrik kimlik doğrulama etkinleştirilemedi.',
      };
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometricAuth(): Promise<void> {
    try {
      await secureStorageService.removeSecureItem(this.BIOMETRIC_TOKEN_KEY);
      await secureStorageService.removeEncryptedItem(this.BIOMETRIC_KEY);
    } catch (error) {
      console.error('Error disabling biometric auth:', error);
    }
  }

  /**
   * Authenticate using biometrics and return stored auth token
   */
  async authenticateAndGetToken(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return {
          success: false,
          error: 'Biyometrik kimlik doğrulama etkinleştirilmemiş.',
        };
      }

      const authResult = await this.authenticateWithBiometrics('Uygulamaya giriş yapmak için kimliğinizi doğrulayın');
      
      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error,
        };
      }

      // Retrieve the stored auth token
      const token = await secureStorageService.getSecureItem(
        this.BIOMETRIC_TOKEN_KEY,
        { requireAuthentication: true }
      );

      if (!token) {
        return {
          success: false,
          error: 'Kimlik doğrulama token\'ı bulunamadı. Lütfen tekrar giriş yapın.',
        };
      }

      return {
        success: true,
        token,
      };
    } catch (error) {
      console.error('Error authenticating with biometrics:', error);
      return {
        success: false,
        error: 'Biyometrik kimlik doğrulama başarısız.',
      };
    }
  }

  /**
   * Perform biometric authentication
   */
  private async authenticateWithBiometrics(promptMessage: string): Promise<BiometricAuthResult> {
    try {
      const capabilities = await this.getBiometricCapabilities();
      
      if (!capabilities.isAvailable || !capabilities.isEnrolled) {
        return {
          success: false,
          error: 'Biyometrik kimlik doğrulama kullanılamıyor.',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'İptal',
        fallbackLabel: 'Şifre kullan',
        disableDeviceFallback: false,
      });

      if (result.success) {
        return {
          success: true,
          biometricType: capabilities.supportedTypes,
        };
      } else {
        let errorMessage = 'Kimlik doğrulama başarısız.';
        
        if (result.error === 'user_cancel') {
          errorMessage = 'Kimlik doğrulama iptal edildi.';
        } else if (result.error === 'user_fallback') {
          errorMessage = 'Alternatif kimlik doğrulama seçildi.';
        } else if (result.error === 'biometric_not_available') {
          errorMessage = 'Biyometrik kimlik doğrulama kullanılamıyor.';
        } else if (result.error === 'biometric_not_enrolled') {
          errorMessage = 'Biyometrik kimlik doğrulama ayarlanmamış.';
        } else if (result.error === 'too_many_attempts') {
          errorMessage = 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.';
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: 'Biyometrik kimlik doğrulama sırasında hata oluştu.',
      };
    }
  }

  /**
   * Get user-friendly biometric type names
   */
  getBiometricTypeNames(types: LocalAuthentication.AuthenticationType[]): string[] {
    const typeNames: string[] = [];
    
    types.forEach(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          typeNames.push('Parmak İzi');
          break;
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          typeNames.push('Yüz Tanıma');
          break;
        case LocalAuthentication.AuthenticationType.IRIS:
          typeNames.push('İris Tanıma');
          break;
        default:
          typeNames.push('Biyometrik');
          break;
      }
    });
    
    return typeNames;
  }

  /**
   * Update stored biometric token when user logs in with new token
   */
  async updateBiometricToken(newToken: string): Promise<boolean> {
    try {
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return false;
      }

      await secureStorageService.setSecureItem(
        this.BIOMETRIC_TOKEN_KEY,
        newToken,
        { requireAuthentication: true }
      );

      return true;
    } catch (error) {
      console.error('Error updating biometric token:', error);
      return false;
    }
  }
}

export default new BiometricAuthService();