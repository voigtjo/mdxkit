import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as authApi from '../api/authApi';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// exp aus JWT (ms seit Epoch)
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
  const [access, setAccess]   = useState(() => localStorage.getItem('accessToken') || '');
  const [refresh, setRefresh] = useState(() => localStorage.getItem('refreshToken') || '');
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(!!access);

  const refreshTimer = useRef(null);

  const scheduleAutoRefresh = (acc) => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    const expMs = getExpMs(acc);
    if (!acc || !expMs) return;
    const now = Date.now();
    const delay = Math.max(5000, expMs - now - 60_000); // 60s vorher

    refreshTimer.current = setTimeout(async () => {
      try {
        // immer frisch aus localStorage holen, um Closure-Staleness zu vermeiden
        const rt = localStorage.getItem('refreshToken') || '';
        if (!rt) throw new Error('no refresh');
        const { accessToken, refreshToken, user } = await authApi.refresh(rt);
        setTokens(accessToken, refreshToken);
        if (user) setUser(user);
      } catch {
        setUser(null);
        clearTokens();
      }
    }, delay);
  };

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

    scheduleAutoRefresh(nextAccess);
  };

  const clearTokens = () => {
    // Timer abbrechen
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    // Tokens & Tenant wegräumen
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tenantId'); // wichtig, damit axios-baseURL nicht hängen bleibt
    } catch {}
    setAccess('');
    setRefresh('');
    scheduleAutoRefresh(''); // räumt sicher auf
  };

  // Initial: /me versuchen, sonst 1x refresh
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

  // Beim Tab-Fokus ggf. vorzeitig refreshen
  useEffect(() => {
    function onFocus() {
      const acc = localStorage.getItem('accessToken') || '';
      const rt  = localStorage.getItem('refreshToken') || '';
      if (!acc || !rt) return;
      const expMs = getExpMs(acc);
      if (!expMs) return;
      const remaining = expMs - Date.now();
      if (remaining < 120_000) {
        authApi.refresh(rt)
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
    const vis = () => { if (document.visibilityState === 'visible') onFocus(); };
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);

  const value = useMemo(() => ({
    user, access, refresh, loading,
    async doRegister({ tenantId, displayName, email, password }) {
      return authApi.register({ tenantId, displayName, email, password });
    },
    async doLogin({ email, password }) {               // ⬅️ kein tenantId im Login mehr
      const { accessToken, refreshToken, user } = await authApi.login({ email, password });
      setTokens(accessToken, refreshToken);
      setUser(user);
      return user;
    },

    async doLogout() {
      try {
        console.log('[Auth] logout start (hasAccess=', !!access, ')');
        if (access) await authApi.logout(access);
      } catch (e) {
        console.warn('[Auth] logout API failed (ignored):', e?.message);
      }
        setUser(null);
        clearTokens();
        // harte Rückkehr, damit alles (inkl. axios baseURL) sauber neu initialisiert
        window.location.href = '/';
      },
  }), [user, access, refresh, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
