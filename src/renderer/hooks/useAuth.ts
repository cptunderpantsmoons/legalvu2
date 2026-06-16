import { useEffect, useCallback } from 'react';
import { useAuthStore, type AuthUser } from '../stores/auth-store';
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  const refresh = useCallback(async () => {
    try {
      const result = await window.electronAPI.authMe();
      setUser(result as AuthUser | null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await window.electronAPI.authLogin({ email, password });
      if (result.error) throw new Error(result.error);
      setUser(result.user as AuthUser);
      return result.user;
    },
    [setUser],
  );

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      const result = await window.electronAPI.authRegister({ email, password, fullName });
      if (result.error) throw new Error(result.error);
      setUser(result.user as AuthUser);
      return result.user;
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    await window.electronAPI.authLogout();
    setUser(null);
  }, [setUser]);

  return { user, loading, login, register, logout, refresh };
}
