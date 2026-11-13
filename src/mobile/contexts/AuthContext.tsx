import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import authService, { isAuthCancelled } from '../services/authService';
import { User, RegisterData, LoginData, AuthResponse, onAuthExpired, refreshSession, userAPI } from '../services/api';
import { notificationService } from '../services/notificationService';

export interface GuestAction {
  type: 'view_need' | 'attempt_offer' | 'attempt_create' | 'attempt_message' | 'attempt_favorite';
  timestamp: Date;
  context?: any;
  needId?: number;
  offerId?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (credentials: LoginData) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  // Social logins resolve to false when the user cancels, true when signed in; throw on error
  googleLogin: () => Promise<boolean>;
  facebookLogin: () => Promise<boolean>;
  appleLogin: () => Promise<boolean>;
  guestContinue: () => Promise<void>;
  convertGuestToUser: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshToken: () => Promise<void>;
  
  // Guest tracking
  guestActions: GuestAction[];
  trackGuestAction: (action: Omit<GuestAction, 'timestamp'>) => void;
  shouldShowAuthPrompt: () => boolean;
  getGuestViewCount: () => number;
  
  // Intended action after auth
  intendedAction: (() => void) | null;
  setIntendedAction: (action: (() => void) | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [guestActions, setGuestActions] = useState<GuestAction[]>([]);
  const [intendedAction, setIntendedAction] = useState<(() => void) | null>(null);
  const handlingExpiryRef = useRef(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  // Token rejected by the API (interceptor already cleared storage): reset local state
  // and continue as guest like logout does. No API logout call, so this cannot loop.
  useEffect(() => {
    return onAuthExpired(async () => {
      if (handlingExpiryRef.current) return;
      handlingExpiryRef.current = true;
      try {
        setUser(null);
        setIsAuthenticated(false);
        setGuestActions([]);
        setIntendedAction(null);
        await guestContinue();
      } finally {
        handlingExpiryRef.current = false;
      }
    });
  }, []);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);

      // Initialize services
      await authService.initializeGoogleSignIn();

      // Check if user is already authenticated
      const authenticated = await authService.isAuthenticated();
      if (authenticated) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);

        // Register push token for existing authenticated users
        await registerPushToken();
      } else {
        // Start in guest mode automatically
        await guestContinue();
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      // Fallback to guest mode
      await guestContinue();
    } finally {
      setIsLoading(false);
    }
  };

  const registerPushToken = async () => {
    try {
      const token = notificationService.getExpoPushToken();
      if (token) {
        // Token is already registered during notification service initialization
        console.log('Push token already registered');
      } else {
        // Initialize notification service if not already done
        await notificationService.initialize();
      }
    } catch (error) {
      console.error('Failed to register push token:', error);
      // Don't throw error - notifications are optional
    }
  };

  const login = async (credentials: LoginData) => {
    try {
      setIsLoading(true);
      const response = await authService.login(credentials);

      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        // Clear guest actions after successful login
        setGuestActions([]);

        // Register push notification token with backend
        await registerPushToken();

        // Execute intended action if any
        if (intendedAction) {
          intendedAction();
          setIntendedAction(null);
        }
      } else {
        throw new Error(response.message || 'Giriş başarısız');
      }
    } catch (error: any) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await authService.register(userData);

      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        // Clear guest actions after successful registration
        setGuestActions([]);

        // Register push notification token with backend
        await registerPushToken();

        // Execute intended action if any
        if (intendedAction) {
          intendedAction();
          setIntendedAction(null);
        }
      } else {
        throw new Error(response.message || 'Kayıt başarısız');
      }
    } catch (error: any) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // A guest who signs in with a social account simply replaces the guest session
  const socialLogin = async (signIn: () => Promise<AuthResponse>): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await signIn();
      if (!response.user) {
        throw new Error(response.message || 'Giriş yapılamadı. Lütfen tekrar deneyin.');
      }

      setUser(response.user);
      setIsAuthenticated(true);
      setGuestActions([]);

      await registerPushToken();

      if (intendedAction) {
        intendedAction();
        setIntendedAction(null);
      }
      return true;
    } catch (error: any) {
      // Cancelling the provider sheet leaves the current (guest) session untouched
      if (isAuthCancelled(error)) {
        return false;
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = () => socialLogin(() => authService.googleSignIn());
  const facebookLogin = () => socialLogin(() => authService.facebookSignIn());
  const appleLogin = () => socialLogin(() => authService.appleSignIn());

  const guestContinue = async () => {
    try {
      setIsLoading(true);
      const response = await authService.guestLogin();
      
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        // Clear any previous guest actions when starting fresh
        setGuestActions([]);
      } else {
        throw new Error(response.message || 'Misafir girişi başarısız');
      }
    } catch (error: any) {
      console.error('Guest continue error:', error);
      // Even if guest login fails, we can continue in offline mode
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const convertGuestToUser = async (userData: RegisterData) => {
    if (!user?.isGuest) {
      throw new Error('Sadece misafir kullanıcılar dönüştürülebilir');
    }

    try {
      setIsLoading(true);
      const response = await authService.convertGuestToUser(userData);

      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        // Clear guest actions after successful conversion
        setGuestActions([]);

        // Register push notification token with backend
        await registerPushToken();

        // Execute intended action if any
        if (intendedAction) {
          intendedAction();
          setIntendedAction(null);
        }
      } else {
        throw new Error(response.message || 'Hesap dönüşümü başarısız');
      }
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
      setGuestActions([]);
      setIntendedAction(null);
      
      // After logout, continue as guest
      await guestContinue();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Deletes the account on the server, then clears the session exactly like logout
  const deleteAccount = async () => {
    await userAPI.deleteAccount();
    await logout();
  };

  const refreshToken = async () => {
    let refreshed: boolean;
    try {
      refreshed = await refreshSession();
    } catch (error) {
      // Network error: the session may still be valid, keep it
      console.warn('Token refresh failed:', error);
      return;
    }
    if (!refreshed) {
      await logout();
    }
  };

  // Guest tracking methods
  const trackGuestAction = (action: Omit<GuestAction, 'timestamp'>) => {
    const newAction: GuestAction = {
      ...action,
      timestamp: new Date()
    };
    
    setGuestActions(prev => {
      // Keep only last 50 actions to prevent memory issues
      const updated = [...prev, newAction].slice(-50);
      return updated;
    });
  };

  const shouldShowAuthPrompt = (): boolean => {
    if (!user?.isGuest) return false;
    
    const viewActions = guestActions.filter(action => action.type === 'view_need');
    return viewActions.length >= 3;
  };

  const getGuestViewCount = (): number => {
    return guestActions.filter(action => action.type === 'view_need').length;
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    isGuest: user?.isGuest || false,
    login,
    register,
    googleLogin,
    facebookLogin,
    appleLogin,
    guestContinue,
    convertGuestToUser,
    logout,
    deleteAccount,
    refreshToken,
    
    // Guest tracking
    guestActions,
    trackGuestAction,
    shouldShowAuthPrompt,
    getGuestViewCount,
    
    // Intended action
    intendedAction,
    setIntendedAction,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;