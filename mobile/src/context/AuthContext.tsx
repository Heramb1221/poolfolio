import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types/api';
import { storage } from '../services/storage';
import { authApi, LoginInput, RegisterInput } from '../api/auth.api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  /** True only during the first token/profile restore on app launch. */
  isInitializing: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await storage.getToken();
        const storedUser = await storage.getUser();

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);

          // Verify with backend silently in background
          try {
            const res = await authApi.getMe();
            setUser(res.user);
            await storage.setUser(res.user);
          } catch {
            // If token invalid, clear
            await storage.clear();
            setToken(null);
            setUser(null);
          }
        }
      } catch {
        // Initialization error fallback
      } finally {
        setIsLoading(false);
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (input: LoginInput) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(input);
      await storage.setToken(res.token);
      await storage.setUser(res.user);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (input: RegisterInput) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(input);
      await storage.setToken(res.token);
      await storage.setUser(res.user);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout().catch(() => {});
    } finally {
      await storage.clear();
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await authApi.getMe();
      setUser(res.user);
      await storage.setUser(res.user);
    } catch {
      // Refresh error ignored
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isInitializing,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
