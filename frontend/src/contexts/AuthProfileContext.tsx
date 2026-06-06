import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/AuthService';
import type { AuthProfile } from '../types/auth';

type AuthProfileContextValue = {
  profile: AuthProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthProfileContext = createContext<AuthProfileContextValue | null>(null);

export function AuthProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await authService.getProfile(true);
      setProfile(next);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const next = await authService.getProfile();
        if (!cancelled) setProfile(next);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      profile,
      loading,
      refresh,
    }),
    [profile, loading, refresh],
  );

  return <AuthProfileContext.Provider value={value}>{children}</AuthProfileContext.Provider>;
}

export function useAuthProfile(): AuthProfileContextValue {
  const ctx = useContext(AuthProfileContext);
  if (!ctx) {
    throw new Error('useAuthProfile deve ser usado dentro de AuthProfileProvider');
  }
  return ctx;
}
