import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const TenantContext = createContext({
  tenantId: null,
  setTenantId: () => {},
  clearTenantId: () => {},
  canSwitchTenant: false,
});

export const TenantProvider = ({ children }) => {
  const { user, loading } = useAuth();

  const [tenantId, setTenantIdState] = useState(null);
  const [canSwitchTenant, setCanSwitchTenant] = useState(false);

  // 1) Initial: aus URL, sonst aus localStorage
  useEffect(() => {
    const m = window.location.pathname.match(/^\/tenant\/([^/]+)/);
    const fromPath = m?.[1] || null;
    if (fromPath) {
      setTenantIdState(fromPath);
    } else {
      try {
        const stored = localStorage.getItem('tenantId');
        if (stored) setTenantIdState(stored);
      } catch {}
    }
  }, []);

  // 2) Reagieren auf Auth: SysAdmin darf wechseln; andere sind gelockt auf user.tenantId
  useEffect(() => {
    if (loading) return;

    const isSys = !!user?.isSystemAdmin;
    setCanSwitchTenant(isSys);

    if (isSys) {
      if (!tenantId) {
        const candidate = user?.tenantId || null;
        if (candidate) setTenantIdState(candidate);
      }
      return;
    }

    const userTid = user?.tenantId || null;
    if (tenantId !== userTid) setTenantIdState(userTid);
  }, [loading, user, tenantId]);

  // Persistenz
  useEffect(() => {
    try {
      if (tenantId) localStorage.setItem('tenantId', tenantId);
      else localStorage.removeItem('tenantId');
    } catch {}
  }, [tenantId]);

  const setTenantId = (id) => {
    if (!canSwitchTenant) return;
    const trimmed = (id || '').trim();
    if (trimmed && !/^[a-zA-Z0-9_-]{2,64}$/.test(trimmed)) {
      alert('Ungültige Tenant-ID (a–Z, 0–9, _ , -, 2–64)');
      return;
    }
    setTenantIdState(trimmed || null);
  };

  const clearTenantId = () => {
    if (!canSwitchTenant) return;
    setTenantIdState(null);
  };

  const value = useMemo(() => ({
    tenantId,
    setTenantId,
    clearTenantId,
    canSwitchTenant,
  }), [tenantId, canSwitchTenant]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
