import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/authApi';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [access, setAccess] = useState(() => localStorage.getItem('accessToken') || '');
  const [refresh, setRefresh] = useState(() => localStorage.getItem('refreshToken') || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!access);

  useEffect(() => {
    if (!access) { setUser(null); setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { user } = await authApi.me(access);
        if (!cancelled) setUser(user);
      } catch {
        // versuche Refresh
        try {
          if (refresh) {
            const { accessToken, refreshToken, user } = await authApi.refresh(refresh);
            if (!cancelled) {
              setAccess(accessToken); localStorage.setItem('accessToken', accessToken);
              if (refreshToken) { setRefresh(refreshToken); localStorage.setItem('refreshToken', refreshToken); }
              setUser(user);
            }
          } else {
            if (!cancelled) { setAccess(''); localStorage.removeItem('accessToken'); }
          }
        } catch {
          if (!cancelled) {
            setAccess(''); setRefresh(''); localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken');
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // nur beim Mount

  const value = useMemo(() => ({
    user, access, refresh, loading,
    async doRegister({ tenantId, displayName, email, password }) {
      return authApi.register({ tenantId, displayName, email, password });
    },
    async doLogin({ tenantId, email, password }) {
      const { accessToken, refreshToken, user } = await authApi.login({ tenantId, email, password });
      setAccess(accessToken); localStorage.setItem('accessToken', accessToken);
      setRefresh(refreshToken); localStorage.setItem('refreshToken', refreshToken);
      setUser(user);
      return user;
    },
    async doLogout() {
      if (access) try { await authApi.logout(access); } catch {}
      setAccess(''); setRefresh(''); localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken');
      setUser(null);
    },
  }), [user, access, refresh, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
