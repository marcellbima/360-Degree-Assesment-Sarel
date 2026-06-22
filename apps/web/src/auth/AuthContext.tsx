import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { MeResponse } from '@sarel/shared';
import { authApi } from '../lib/api';

interface AuthState {
  user: MeResponse | null;
  loading: boolean;
  login: (userId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mengembalikan sesi yang masih hidup berdasarkan cookie. Diam saja jika gagal.
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(userId: string, password: string): Promise<void> {
    const me = await authApi.login(userId, password);
    setUser(me);
  }

  async function logout(): Promise<void> {
    await authApi.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider.');
  }
  return ctx;
}
