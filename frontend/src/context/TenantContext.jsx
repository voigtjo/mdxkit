import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const TenantContext = createContext({
  tenantId: null,
  setTenantId: () => {},
  clearTenantId: () => {},
  canSwitchTenant: false,

  // ⬇︎ NEU: Gruppen-Kontext
  groupId: null,
  setGroupId: () => {},
  groupRoles: [],
  userMemberships: [],
});

export const TenantProvider = ({ children }) => {
  const { user, loading } = useAuth();

  const [tenantId, setTenantIdState] = useState(null);
  const [canSwitchTenant, setCanSwitchTenant] = useState(false);

  // ─── Gruppen-State ──────────────────────────────────────────
  const [groupId, setGroupIdState] = useState(null);

  // Hilfen
  const userTenantId = user?.tenantId || null;
  const isSys = !!user?.isSystemAdmin;

  // 1) Initial: tenantId aus URL, sonst aus localStorage
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

  // 2) Auf Auth reagieren: SysAdmin darf wechseln; andere sind auf user.tenantId gelockt
  useEffect(() => {
    if (loading) return;

    setCanSwitchTenant(isSys);

    if (isSys) {
      // SysAdmin: tenantId nicht erzwingen; wenn leer → bevorzugt user.tenantId
      if (!tenantId && userTenantId) setTenantIdState(userTenantId);
      return;
    }

    // Nicht-Sys: tenantId immer auf User-Tenant fixieren
    if (tenantId !== userTenantId) setTenantIdState(userTenantId);
  }, [loading, isSys, userTenantId, tenantId]);

  // Persistenz (Tenant)
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

  // ────────────────────────────────────────────────────────────
  // Gruppen-Initialisierung (Default-Gruppe; per-Tenant Persistenz)
  const membershipsRaw = Array.isArray(user?.memberships) ? user.memberships : [];
  const memberships = useMemo(
    () =>
      membershipsRaw
        .filter(m => m && m.groupId)
        .map(m => ({ groupId: String(m.groupId), roles: Array.isArray(m.roles) ? m.roles : [] })),
    [membershipsRaw]
  );

  useEffect(() => {
    if (loading) return;
    if (!tenantId || isSys) {
      // SysAdmins / kein Tenant → keine aktive Gruppe
      setGroupIdState(null);
      return;
    }

    const persistKey = `groupId:${tenantId}`;

    // 1) versuchen, gespeicherte Gruppe zu nehmen (wenn Mitglied)
    let next = null;
    try {
      const stored = localStorage.getItem(persistKey);
      if (stored && memberships.some(m => m.groupId === stored)) {
        next = stored;
      }
    } catch {}

    // 2) sonst Default-Gruppe des Users
    if (!next && user?.defaultGroupId) {
      const def = String(user.defaultGroupId);
      if (memberships.some(m => m.groupId === def)) next = def;
    }

    // 3) sonst erste Mitgliedschaft
    if (!next && memberships.length > 0) {
      next = memberships[0].groupId;
    }

    setGroupIdState(next || null);
  }, [loading, tenantId, isSys, user?.defaultGroupId, memberships]);

  // Persistenz (Group; per Tenant)
  useEffect(() => {
    if (!tenantId) return;
    const key = `groupId:${tenantId}`;
    try {
      if (groupId) localStorage.setItem(key, groupId);
      else localStorage.removeItem(key);
    } catch {}
  }, [tenantId, groupId]);

  const setGroupId = (gid) => {
    if (!gid) { setGroupIdState(null); return; }
    const ok = memberships.some(m => m.groupId === gid);
    if (!ok) return;
    setGroupIdState(gid);
  };

  // Aktive Rollen (der ausgewählten Gruppe)
  const groupRoles = useMemo(() => {
    if (!groupId) return [];
    return memberships.find(m => m.groupId === groupId)?.roles || [];
  }, [groupId, memberships]);

  const value = useMemo(() => ({
    tenantId,
    setTenantId,
    clearTenantId,
    canSwitchTenant,

    groupId,
    setGroupId,
    groupRoles,
    userMemberships: memberships,
  }), [tenantId, canSwitchTenant, groupId, groupRoles, memberships]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
