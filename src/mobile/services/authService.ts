import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { authAPI, RegisterData, LoginData, User } from './api';
import secureStorageService from './secureStorageService';
import biometricAuthService from './biometricAuthService';

class AuthService {
  async initializeGoogleSignIn() {
    // Expo için WebBrowser kullanarak OAuth flow'u implement edilecek
    console.log('Google Sign-In initialized for Expo');
  }

  async register(data: RegisterData) {
    try {
      const response = await authAPI.register(data);
      if (response.success && response.token && response.user) {
        await this.saveAuthData(response.token, response.user);
      }
      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Kayıt sırasında hata oluştu');
    }
  }

  async login(data: LoginData) {
    try {
      const response = await authAPI.login(data);
      if (response.success && response.token && response.user) {
        await this.saveAuthData(response.token, response.user);
      }
      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Giriş sırasında hata oluştu');
    }
  }

  async googleSignIn() {
    try {
      // Expo için WebBrowser kullanarak OAuth flow
      const redirectUrl = Linking.createURL('auth');
      const authUrl = `http://localhost:5000/api/auth/google?redirect_uri=${encodeURIComponent(redirectUrl)}`;
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const token = url.searchParams.get('token');
        const error = url.searchParams.get('error');
        
        if (error) {
          throw new Error(error);
        }
        
        if (token) {
          // Token ile kullanıcı bilgilerini al
          const user = await this.getUserFromToken(token);
          await this.saveAuthData(token, user);
          return { success: true, user, token };
        }
      }
      
      throw new Error('Google girişi iptal edildi');
    } catch (error: any) {
      throw new Error(error.message || 'Google girişi sırasında hata oluştu');
    }
  }

  async facebookSignIn() {
    try {
      // Expo için WebBrowser kullanarak OAuth flow
      const redirectUrl = Linking.createURL('auth');
      const authUrl = `http://localhost:5000/api/auth/facebook?redirect_uri=${encodeURIComponent(redirectUrl)}`;
      
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const token = url.searchParams.get('token');
        const error = url.searchParams.get('error');
        
        if (error) {
          throw new Error(error);
        }
        
        if (token) {
          // Token ile kullanıcı bilgilerini al
          const user = await this.getUserFromToken(token);
          await this.saveAuthData(token, user);
          return { success: true, user, token };
        }
      }
      
      throw new Error('Facebook girişi iptal edildi');
    } catch (error: any) {
      throw new Error(error.message || 'Facebook girişi sırasında hata oluştu');
    }
  }

  async guestLogin() {
    try {
      const response = await authAPI.guestLogin();
      if (response.success && response.token && response.user) {
        await this.saveAuthData(response.token, response.user);
      }
      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Misafir girişi sırasında hata oluştu');
    }
  }

  async convertGuestToUser(data: RegisterData) {
    try {
      const response = await authAPI.convertGuestToUser(data);
      if (response.success && response.token && response.user) {
        await this.saveAuthData(response.token, response.user);
      }
      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Hesap dönüşümü sırasında hata oluştu');
    }
  }

  async logout() {
    try {
      // Clear secure storage
      await secureStorageService.clearAuthTokens();
      
      // Clear biometric authentication
      await biometricAuthService.disableBiometricAuth();
      
      // Clear regular storage
      await AsyncStorage.multiRemove(['user']);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userStr = await AsyncStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      return null;
    }
  }

  async getAuthToken(): Promise<string | null> {
    try {
      const tokens = await secureStorageService.getAuthTokens();
      return tokens.accessToken;
    } catch (error) {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }

  private async getUserFromToken(token: string): Promise<User> {
    try {
      // Token'ı geçici olarak güvenli depolamaya kaydet
      await secureStorageService.storeAuthTokens(token);
      
      // Kullanıcı bilgilerini al
      const user = await authAPI.getCurrentUser();
      return user;
    } catch (error) {
      // Token geçersizse temizle
      await secureStorageService.clearAuthTokens();
      throw error;
    }
  }

  private async saveAuthData(token: string, user: User, refreshToken?: string) {
    // Store tokens securely
    await secureStorageService.storeAuthTokens(token, refreshToken);
    
    // Store user data in regular storage (non-sensitive)
    await AsyncStorage.setItem('user', JSON.stringify(user));
    
    // Update biometric token if enabled
    await biometricAuthService.updateBiometricToken(token);
  }

  async authenticateWithBiometrics(): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const result = await biometricAuthService.authenticateAndGetToken();
      
      if (!result.success || !result.token) {
        return {
          success: false,
          error: result.error || 'Biyometrik kimlik doğrulama başarısız',
        };
      }

      // Validate token and get user info
      const user = await this.getUserFromToken(result.token);
      
      return {
        success: true,
        user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Biyometrik kimlik doğrulama sırasında hata oluştu',
      };
    }
  }

  async enableBiometricAuth(): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return {
          success: false,
          error: 'Önce giriş yapmanız gerekiyor',
        };
      }

      const result = await biometricAuthService.enableBiometricAuth(token);
      return {
        success: result.success,
        error: result.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Biyometrik kimlik doğrulama etkinleştirilemedi',
      };
    }
  }

  async isBiometricEnabled(): Promise<boolean> {
    return await biometricAuthService.isBiometricEnabled();
  }

  async getBiometricCapabilities() {
    return await biometricAuthService.getBiometricCapabilities();
  }
}

export default new AuthService();