// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  meStored,
  refreshStored,
  login as apiLogin,   // login(email, password)
  saveTokens,
  clearTokens,
  logout as apiLogout,
  getAccessToken,
  getRefreshToken,
} from '@/api/authApi';

const AuthCtx = createContext({
  user: null,
  loading: true,
  doLogin: async (_email, _password) => {},
  doLogout: async () => {},
  refreshUser: async () => {},
});

const isProd = import.meta?.env?.MODE === 'production' || process.env.NODE_ENV === 'production';
const dlog = (...a) => { if (!isProd) console.debug('[Auth]', ...a); };

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const hasAT = !!getAccessToken();
        const hasRT = !!getRefreshToken();

        if (!hasAT && !hasRT) {
          setUser(null);
          return;
        }

        try {
          const u = await meStored();
          if (!alive) return;
          setUser(u);
          dlog('me() → setUser', {
            email: u?.email,
            tenantId: u?.tenantId || u?.tenant?.tenantId || null,
            groupsCount: Array.isArray(u?.groups) ? u.groups.length : 0,
          });
        } catch (e) {
          if (e?.status === 401 && hasRT) {
            const r = await refreshStored();
            saveTokens(r || {});
            const u2 = await meStored();
            if (!alive) return;
            setUser(u2);
            dlog('refresh→me() → setUser', {
              email: u2?.email,
              tenantId: u2?.tenantId || u2?.tenant?.tenantId || null,
              groupsCount: Array.isArray(u2?.groups) ? u2.groups.length : 0,
            });
          } else {
            clearTokens();
            if (!alive) return;
            setUser(null);
          }
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const doLogin = async (email, password) => {
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      if (data?.accessToken || data?.refreshToken) saveTokens(data);

      if (data?.user) {
        setUser(data.user);
        const u = data.user;
        dlog('login→user', {
          email: u?.email,
          tenantId: u?.tenantId || u?.tenant?.tenantId || null,
          groupsCount: Array.isArray(u?.groups) ? u.groups.length : 0,
        });
      } else {
        const u = await meStored();
        setUser(u);
        dlog('login→me()', {
          email: u?.email,
          tenantId: u?.tenantId || u?.tenant?.tenantId || null,
          groupsCount: Array.isArray(u?.groups) ? u.groups.length : 0,
        });
      }
      return true;
    } catch (e) {
      clearTokens();
      setUser(null);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const doLogout = async () => {
    try { await apiLogout(); } catch {}
    clearTokens();
    setUser(null);
  };

  const refreshUser = async () => {
    const hasAT = !!getAccessToken();
    const hasRT = !!getRefreshToken();
    if (!hasAT && !hasRT) {
      setUser(null);
      return null;
    }
    try {
      const u = await meStored();
      setUser(u);
      dlog('refreshUser() → me()', {
        email: u?.email,
        tenantId: u?.tenantId || u?.tenant?.tenantId || null,
        groupsCount: Array.isArray(u?.groups) ? u.groups.length : 0,
      });
      return u;
    } catch (e) {
      if (e?.status === 401 && hasRT) {
        const r = await refreshStored();
        saveTokens(r || {});
        const u2 = await meStored();
        setUser(u2);
        dlog('refreshUser() → refresh→me()', {
          email: u2?.email,
          tenantId: u2?.tenantId || u2?.tenant?.tenantId || null,
          groupsCount: Array.isArray(u2?.groups) ? u2.groups.length : 0,
        });
        return u2;
      }
      clearTokens();
      setUser(null);
      return null;
    }
  };

  const value = useMemo(() => ({
    user,
    loading,
    doLogin,
    doLogout,
    refreshUser,
  }), [user, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
