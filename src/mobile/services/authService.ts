import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { authAPI, AuthResponse, RegisterData, LoginData, User } from './api';
import secureStorageService from './secureStorageService';
import biometricAuthService from './biometricAuthService';

// Thrown when the user closes a social sign-in sheet. Callers treat it as "nothing happened".
export class AuthCancelledError extends Error {
  constructor() {
    super('Sign-in cancelled by user');
    this.name = 'AuthCancelledError';
  }
}

export const isAuthCancelled = (error: unknown): error is AuthCancelledError =>
  error instanceof AuthCancelledError;

// The Google and Facebook SDKs are native modules: the Google one throws at import time when
// the native code is missing (Expo Go, tests), so load both lazily.
type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');
type FacebookModule = typeof import('react-native-fbsdk-next');

const loadGoogleSignIn = (): GoogleSignInModule | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-google-signin/google-signin');
  } catch {
    return null;
  }
};

const loadFacebook = (): FacebookModule | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-fbsdk-next');
  } catch {
    return null;
  }
};

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;

class AuthService {
  private googleConfigured = false;
  private facebookInitialized = false;

  async initializeGoogleSignIn() {
    this.configureGoogle();
  }

  private configureGoogle(): GoogleSignInModule | null {
    if (!GOOGLE_WEB_CLIENT_ID) return null;
    const google = loadGoogleSignIn();
    if (!google) return null;
    if (!this.googleConfigured) {
      google.GoogleSignin.configure({
        // The web client ID makes the SDK return an ID token the backend can verify
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
      });
      this.googleConfigured = true;
    }
    return google;
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

  async googleSignIn(): Promise<AuthResponse> {
    const google = this.configureGoogle();
    if (!google) {
      throw new Error('Google ile giriş şu anda kullanılamıyor.');
    }
    const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = google;

    let idToken: string | null = null;
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const result = await GoogleSignin.signIn();
      if (!isSuccessResponse(result)) {
        throw new AuthCancelledError();
      }
      idToken = result.data.idToken;
    } catch (error) {
      if (isAuthCancelled(error)) throw error;
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) {
          throw new AuthCancelledError();
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new Error('Google ile giriş için Google Play Hizmetleri gerekli. Güncelleyip tekrar deneyin.');
        }
      }
      console.warn('Google sign-in failed:', error);
      throw new Error('Google ile giriş yapılamadı. Lütfen tekrar deneyin.');
    }

    if (!idToken) {
      throw new Error('Google ile giriş yapılamadı. Lütfen tekrar deneyin.');
    }
    const token = idToken;
    return this.completeSocialLogin(
      () => authAPI.googleLogin(token),
      'Google ile giriş yapılamadı. Lütfen tekrar deneyin.'
    );
  }

  async facebookSignIn(): Promise<AuthResponse> {
    const facebook = FACEBOOK_APP_ID ? loadFacebook() : null;
    if (!facebook) {
      throw new Error('Facebook ile giriş şu anda kullanılamıyor.');
    }
    const { LoginManager, AccessToken, AuthenticationToken, Settings } = facebook;

    let facebookToken: string | undefined;
    try {
      if (!this.facebookInitialized) {
        Settings.initializeSDK();
        this.facebookInitialized = true;
      }
      // 'enabled' gives classic login (access token, verified via Graph API) when App Tracking is
      // authorized; otherwise iOS falls back to Limited Login, which only yields an OIDC
      // authentication token (JWT) that the backend validates against Facebook's JWKS.
      // The nonce is embedded in that JWT; the backend does not verify it yet.
      const nonce = Platform.OS === 'ios' ? Crypto.randomUUID() : undefined;
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email'], 'enabled', nonce);
      if (result.isCancelled) {
        throw new AuthCancelledError();
      }
      const tokenData = await AccessToken.getCurrentAccessToken();
      facebookToken = tokenData?.accessToken;
      if (!facebookToken && Platform.OS === 'ios') {
        const authToken = await AuthenticationToken.getAuthenticationTokenIOS();
        facebookToken = authToken?.authenticationToken;
      }
    } catch (error) {
      if (isAuthCancelled(error)) throw error;
      console.warn('Facebook sign-in failed:', error);
      throw new Error('Facebook ile giriş yapılamadı. Lütfen tekrar deneyin.');
    }

    if (!facebookToken) {
      throw new Error('Facebook ile giriş tamamlanamadı. Lütfen başka bir giriş yöntemi deneyin.');
    }
    const token = facebookToken;
    return this.completeSocialLogin(
      () => authAPI.facebookLogin(token),
      'Facebook ile giriş yapılamadı. Lütfen tekrar deneyin.'
    );
  }

  async isAppleSignInAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    try {
      return await AppleAuthentication.isAvailableAsync();
    } catch {
      return false;
    }
  }

  async appleSignIn(): Promise<AuthResponse> {
    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        throw new AuthCancelledError();
      }
      console.warn('Apple sign-in failed:', error);
      throw new Error('Apple ile giriş yapılamadı. Lütfen tekrar deneyin.');
    }

    const { identityToken, fullName } = credential;
    if (!identityToken) {
      throw new Error('Apple ile giriş yapılamadı. Lütfen tekrar deneyin.');
    }
    // Apple shares the name only on the first authorization
    return this.completeSocialLogin(
      () => authAPI.appleLogin({
        identityToken,
        firstName: fullName?.givenName ?? undefined,
        lastName: fullName?.familyName ?? undefined,
      }),
      'Apple ile giriş yapılamadı. Lütfen tekrar deneyin.'
    );
  }

  // Exchanges the provider token with the backend and stores the session like email login
  private async completeSocialLogin(
    request: () => Promise<AuthResponse>,
    fallbackMessage: string
  ): Promise<AuthResponse> {
    let response: AuthResponse;
    try {
      response = await request();
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      throw new Error(typeof serverMessage === 'string' && serverMessage ? serverMessage : fallbackMessage);
    }
    if (!response?.success || !response.token || !response.user) {
      throw new Error(response?.message || fallbackMessage);
    }
    await this.saveAuthData(response.token, response.user, response.refreshToken);
    return response;
  }

  // Ends the provider sessions so the next social login shows the account picker again
  private async signOutSocialProviders() {
    if (this.googleConfigured) {
      try {
        await loadGoogleSignIn()?.GoogleSignin.signOut();
      } catch {}
    }
    if (this.facebookInitialized) {
      try {
        loadFacebook()?.LoginManager.logOut();
      } catch {}
    }
  }

  async forgotPassword(email: string): Promise<string> {
    try {
      const response = await authAPI.forgotPassword(email);
      return response?.message || 'Bu e-posta adresi kayıtlıysa şifre sıfırlama bağlantısı gönderildi.';
    } catch (error: any) {
      const serverMessage = error.response?.data?.message;
      throw new Error(
        typeof serverMessage === 'string' && serverMessage
          ? serverMessage
          : 'İstek gönderilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.'
      );
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
      await this.signOutSocialProviders();

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