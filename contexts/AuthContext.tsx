'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { AuthToken } from '@/types';
import {
  getValidToken,
  storeToken,
  clearToken,
  isTokenExpiringSoon,
} from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';

interface AuthContextValue {
  auth: AuthToken | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isExpiringSoon: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = getValidToken();
    setAuth(stored);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api.login(username, password);
    storeToken(data);
    setAuth(data);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    clearToken();
    setAuth(null);
    router.push('/login');
  }, [router]);

  const isExpiringSoon = auth ? isTokenExpiringSoon(auth) : false;

  return (
    <AuthContext.Provider value={{ auth, isLoading, login, logout, isExpiringSoon }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
