import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import authService from '../services/authService';
import { User, RegisterData, LoginData } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginData) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  googleLogin: () => Promise<void>;
  facebookLogin: () => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setIsAuthenticated(false);
      setUser(null);
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
      } else {
        throw new Error(response.message || 'Google girişi başarısız');
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
      } else {
        throw new Error(response.message || 'Facebook girişi başarısız');
      }
    } catch (error: any) {
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const guestLogin = async () => {
    try {
      setIsLoading(true);
      const response = await authService.guestLogin();
      
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        throw new Error(response.message || 'Misafir girişi başarısız');
      }
    } catch (error: any) {
      setIsAuthenticated(false);
      setUser(null);
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

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    googleLogin,
    facebookLogin,
    guestLogin,
    logout,
    refreshToken,
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