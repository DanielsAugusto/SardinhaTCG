import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as api from '../services/api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [username, setUsername] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setUsername(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    api.setUnauthorizedHandler(clearSession);
    api
      .me()
      .then((user) => {
        setUsername(user.username);
        setStatus('authenticated');
      })
      .catch(clearSession);
    return () => api.setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = useCallback(async (user: string, password: string) => {
    const result = await api.login(user, password);
    setUsername(result.username);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(() => ({ status, username, login, logout }), [status, username, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
