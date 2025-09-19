import AsyncStorage from '@react-native-async-storage/async-storage';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
// import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { authAPI, RegisterData, LoginData, User } from './api';

class AuthService {
  async initializeGoogleSignIn() {
    // Expo Go'da Google Sign-In çalışmaz, native build gerekir
    console.log('Google Sign-In initialized (mock for Expo Go)');
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
      // Expo Go'da çalışmaz, demo için mock response
      throw new Error('Google girişi Expo Go\'da desteklenmiyor. Native build gereklidir.');
    } catch (error: any) {
      throw new Error(error.message || 'Google girişi sırasında hata oluştu');
    }
  }

  async facebookSignIn() {
    try {
      // Expo Go'da çalışmaz, demo için mock response
      throw new Error('Facebook girişi Expo Go\'da desteklenmiyor. Native build gereklidir.');
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

  async logout() {
    try {
      // Local storage temizle
      await AsyncStorage.multiRemove(['authToken', 'user']);
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
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }

  private async saveAuthData(token: string, user: User) {
    await AsyncStorage.setItem('authToken', token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
  }
}

export default new AuthService();