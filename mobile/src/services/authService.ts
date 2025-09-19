import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { authAPI, RegisterData, LoginData, User } from './api';

class AuthService {
  async initializeGoogleSignIn() {
    GoogleSignin.configure({
      webClientId: 'your-google-web-client-id', // Google Console'dan alacağınız
      offlineAccess: true,
    });
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
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      if (userInfo.idToken) {
        const response = await authAPI.socialLogin({
          provider: 'Google',
          accessToken: userInfo.idToken,
        });
        
        if (response.success && response.token && response.user) {
          await this.saveAuthData(response.token, response.user);
        }
        return response;
      }
      throw new Error('Google giriş token\'ı alınamadı');
    } catch (error: any) {
      throw new Error(error.message || 'Google girişi sırasında hata oluştu');
    }
  }

  async facebookSignIn() {
    try {
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      
      if (result.isCancelled) {
        throw new Error('Facebook girişi iptal edildi');
      }

      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        throw new Error('Facebook access token alınamadı');
      }

      const response = await authAPI.socialLogin({
        provider: 'Facebook',
        accessToken: data.accessToken,
      });
      
      if (response.success && response.token && response.user) {
        await this.saveAuthData(response.token, response.user);
      }
      return response;
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
      // Google sign out
      if (await GoogleSignin.isSignedIn()) {
        await GoogleSignin.signOut();
      }
      
      // Facebook sign out
      LoginManager.logOut();
      
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