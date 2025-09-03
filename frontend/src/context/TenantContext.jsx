import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const TenantContext = createContext({
  tenantId: null,
  setTenantId: () => {},
  clearTenantId: () => {},
  canSwitchTenant: false,
});

/**
 * Quelle der Wahrheit:
 * - Nicht-SysAdmin → tenantId = user.tenantId (fix; kein Wechsel)
 * - SysAdmin → darf Tenant wählen; initial aus URL (/tenant/:id) oder sonst user.tenantId
 * - URL hat Priorität beim Initialisieren (verhindert Flashback auf alten LocalStorage)
 */
export const TenantProvider = ({ children }) => {
  const { user, loading } = useAuth();

  const [tenantId, setTenantIdState] = useState(null);
  const [canSwitchTenant, setCanSwitchTenant] = useState(false);

  // 1) Beim ersten Mount: tenantId aus URL ziehen, falls vorhanden
  useEffect(() => {
    const m = window.location.pathname.match(/^\/tenant\/([^/]+)/);
    const fromPath = m?.[1] || null;
    if (fromPath) setTenantIdState(fromPath);
  }, []);

  // 2) Sobald Auth da ist: SysAdmin-Erkennung + Locking/Default
  useEffect(() => {
    if (loading) return;

    const isSys = !!user?.isSystemAdmin;
    setCanSwitchTenant(isSys);

    if (isSys) {
      // SysAdmin: Wenn noch kein Tenant gesetzt, auf eigenen (falls vorhanden) setzen
      if (!tenantId) setTenantIdState(user?.tenantId || null);
      return;
    }

    // Nicht-SysAdmin: tenantId immer aus dem User übernehmen (kein Wechsel erlaubt)
    const userTid = user?.tenantId || null;
    if (tenantId !== userTid) setTenantIdState(userTid);
  }, [loading, user, tenantId]);

  const setTenantId = (id) => {
    if (!canSwitchTenant) return; // nur SysAdmin darf wechseln
    const trimmed = (id || '').trim();
    if (trimmed && !/^[a-zA-Z0-9_-]{2,64}$/.test(trimmed)) {
      alert('Ungültige Tenant-ID (erlaubt: a–Z, 0–9, _ , -, Länge 2–64)');
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
