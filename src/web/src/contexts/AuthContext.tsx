import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { authAPI } from '../services/api';
import type { User, LoginData, RegisterData, AuthResponse } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  guestContinue: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;
  const isGuest = user?.isGuest ?? false;

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
          setUser(JSON.parse(storedUser));
          // Optionally verify token with backend
          try {
            const currentUser = await authAPI.getCurrentUser();
            setUser(currentUser);
            localStorage.setItem('user', JSON.stringify(currentUser));
          } catch {
            // Token invalid, clear storage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      } catch {
        // Error reading from storage
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleAuthResponse = useCallback((response: AuthResponse) => {
    if (response.success && response.token && response.user) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
      setError(null);
    } else {
      throw new Error(response.message || 'Kimlik dogrulama basarisiz');
    }
  }, []);

  const login = useCallback(async (data: LoginData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authAPI.login(data);
      handleAuthResponse(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error
        ? err.message
        : (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Giris yapilamadi. Lutfen bilgilerinizi kontrol edin.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthResponse]);

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authAPI.register(data);
      handleAuthResponse(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error
        ? err.message
        : (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Kayit yapilamadi. Lutfen bilgilerinizi kontrol edin.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthResponse]);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
  }, []);

  const guestContinue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authAPI.guestLogin();
      handleAuthResponse(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error
        ? err.message
        : (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Misafir girisi yapilamadi.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthResponse]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isGuest,
    isLoading,
    error,
    login,
    register,
    logout,
    guestContinue,
    clearError,
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
