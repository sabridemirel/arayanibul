import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import authService from '../services/authService';
import { User, RegisterData, LoginData } from '../services/api';

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
  googleLogin: () => Promise<void>;
  facebookLogin: () => Promise<void>;
  guestContinue: () => Promise<void>;
  convertGuestToUser: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
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

  useEffect(() => {
    initializeAuth();
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

  const login = async (credentials: LoginData) => {
    try {
      setIsLoading(true);
      const response = await authService.login(credentials);
      
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        // Clear guest actions after successful login
        setGuestActions([]);
        
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

  const googleLogin = async () => {
    try {
      setIsLoading(true);
      const response = await authService.googleSignIn();
      
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        // Clear guest actions after successful login
        setGuestActions([]);
        
        // Execute intended action if any
        if (intendedAction) {
          intendedAction();
          setIntendedAction(null);
        }
      } else {
        throw new Error('Google girişi başarısız');
      }
    } catch (error: any) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const facebookLogin = async () => {
    try {
      setIsLoading(true);
      const response = await authService.facebookSignIn();
      
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        // Clear guest actions after successful login
        setGuestActions([]);
        
        // Execute intended action if any
        if (intendedAction) {
          intendedAction();
          setIntendedAction(null);
        }
      } else {
        throw new Error('Facebook girişi başarısız');
      }
    } catch (error: any) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

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

  const refreshToken = async () => {
    try {
      // Token refresh logic will be implemented when backend supports it
      const token = await authService.getAuthToken();
      if (!token) {
        await logout();
      }
    } catch (error) {
      console.error('Token refresh error:', error);
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
    guestContinue,
    convertGuestToUser,
    logout,
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