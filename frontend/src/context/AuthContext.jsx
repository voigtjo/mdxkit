import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as authApi from '../api/authApi';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// Kleiner Helfer: exp aus JWT (in ms seit Epoch) holen
function getExpMs(jwt) {
  if (!jwt || typeof jwt !== 'string') return 0;
  const parts = jwt.split('.');
  if (parts.length !== 3) return 0;
  try {
    const json = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!json || !json.exp) return 0;
    return json.exp * 1000;
  } catch {
    return 0;
  }
}

export default function AuthProvider({ children }) {
  const [access, setAccess] = useState(() => localStorage.getItem('accessToken') || '');
  const [refresh, setRefresh] = useState(() => localStorage.getItem('refreshToken') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!access);

  const refreshTimer = useRef(null);

  // zentraler Setter, der auch den Timer neu plant
  const setTokens = (nextAccess, maybeNextRefresh) => {
    setAccess(nextAccess || '');
    if (nextAccess) localStorage.setItem('accessToken', nextAccess);
    else localStorage.removeItem('accessToken');

    if (typeof maybeNextRefresh === 'string') {
      setRefresh(maybeNextRefresh);
      localStorage.setItem('refreshToken', maybeNextRefresh);
    } else if (maybeNextRefresh === null) {
      setRefresh('');
      localStorage.removeItem('refreshToken');
    }

    scheduleAutoRefresh(nextAccess); // ⬅️ Timer planen/clearen
  };

  const clearTokens = () => {
    setTokens('', null);
  };

  // Timer planen: ~1 Minute vor Ablauf refreshen
  const scheduleAutoRefresh = (acc) => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    const expMs = getExpMs(acc);
    if (!acc || !expMs) return;
    const now = Date.now();
    // Safety: mind. 5s, sonst 60s vor Ablauf
    const delay = Math.max(5000, expMs - now - 60_000);
    refreshTimer.current = setTimeout(async () => {
      try {
        if (!refresh) throw new Error('no refresh');
        const { accessToken, refreshToken, user } = await authApi.refresh(refresh);
        setTokens(accessToken, refreshToken); // refreshToken kann undefined sein → bleibt bestehen
        if (user) setUser(user);
      } catch {
        // Refresh fehlgeschlagen -> sauber abmelden
        setUser(null);
        clearTokens();
      }
    }, delay);
  };

  // Beim Mount: /me versuchen, sonst 1x refresh
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!access) { setLoading(false); return; }
      try {
        const { user } = await authApi.me(access);
        if (!cancelled) {
          setUser(user);
          setLoading(false);
          scheduleAutoRefresh(access);
        }
      } catch {
        try {
          if (refresh) {
            const { accessToken, refreshToken, user } = await authApi.refresh(refresh);
            if (!cancelled) {
              setTokens(accessToken, refreshToken);
              setUser(user);
            }
          } else {
            if (!cancelled) clearTokens();
          }
        } catch {
          if (!cancelled) clearTokens();
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Beim Fokus (Tab wird aktiv): wenn <2min Restzeit -> sofort refresh
  useEffect(() => {
    function onFocus() {
      if (!access || !refresh) return;
      const expMs = getExpMs(access);
      if (!expMs) return;
      const remaining = expMs - Date.now();
      if (remaining < 120_000) {
        authApi.refresh(refresh)
          .then(({ accessToken, refreshToken, user }) => {
            setTokens(accessToken, refreshToken);
            if (user) setUser(user);
          })
          .catch(() => {
            setUser(null);
            clearTokens();
          });
      }
    }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onFocus();
    });
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access, refresh]);

  const value = useMemo(() => ({
    user, access, refresh, loading,
    async doRegister({ tenantId, displayName, email, password }) {
      return authApi.register({ tenantId, displayName, email, password });
    },
    async doLogin({ tenantId, email, password }) {
      const { accessToken, refreshToken, user } = await authApi.login({ tenantId, email, password });
      setTokens(accessToken, refreshToken);
      setUser(user);
      return user;
    },
    async doLogout() {
      try {
        if (access) await authApi.logout(access);
      } catch {}
      setUser(null);
      clearTokens();
    },
  }), [user, access, refresh, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
