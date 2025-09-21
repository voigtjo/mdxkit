// frontend/src/context/TenantContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const TenantContext = createContext({
  tenantId: null,
  setTenantId: () => {},
  clearTenantId: () => {},
  canSwitchTenant: false,

  groupId: null,
  setGroupId: () => {},
  groupRoles: [],
  userMemberships: [],
});

const isProd = import.meta?.env?.MODE === 'production' || process.env.NODE_ENV === 'production';
const dlog = (...a) => { if (!isProd) console.debug('[TenantCtx]', ...a); };

export const TenantProvider = ({ children }) => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const [tenantId, setTenantIdState] = useState(null);
  const [canSwitchTenant, setCanSwitchTenant] = useState(false);

  // ─── Gruppen-State ──────────────────────────────────────────
  const [groupId, setGroupIdState] = useState(null);

  // Hilfen
  const userTenantId =
    user?.tenant?.tenantId || // falls Backend tenant-Objekt eingebettet schickt
    user?.tenantId ||          // fallback: plain tenantId
    null;

  const isSys = !!user?.isSystemAdmin;

  // in TenantContext.jsx – innerhalb des Providers:
useEffect(() => {
  // Wenn kein SysAdmin und Backend eine TenantId mitliefert → im Context & LS merken
  const fromUser = user?.tenant?.tenantId || user?.tenantId || null;
  if (!loading && user && !user.isSystemAdmin && fromUser && fromUser !== tenantId) {
    try { localStorage.setItem('tenantId', fromUser); } catch {}
    setTenantIdState(fromUser); // nur State setzen, KEIN navigate()
  }
}, [user, loading]); // + tenantId, setTenantIdState aus deinem State


  // 1) Initial: tenantId aus URL, sonst LS
  useEffect(() => {
    const m = window.location.pathname.match(/^\/tenant\/([^/]+)/);
    const fromPath = m?.[1] || null;
    if (fromPath) {
      dlog('Init URL→tenantId', fromPath);
      setTenantIdState(fromPath);
      return;
    }
    try {
      const stored = localStorage.getItem('tenantId');
      if (stored) {
        dlog('Init LS→tenantId', stored);
        setTenantIdState(stored);
      }
    } catch {}
  }, []);

  // 2) Auth-Änderungen: Sys darf wechseln; alle anderen auf userTenantId fixieren
  useEffect(() => {
    if (loading) return;

    setCanSwitchTenant(isSys);

    if (isSys) {
      // SysAdmin → wenn noch kein tenantId gewählt, bevorzugt userTenantId übernehmen
      if (!tenantId && userTenantId) {
        dlog('SysAdmin fallback userTenantId', userTenantId);
        setTenantIdState(userTenantId);
      }
      return;
    }

    // Nicht-Sys: tenantId MUSS userTenantId sein
    if (tenantId !== userTenantId) {
      dlog('Lock to userTenantId', { prev: tenantId, next: userTenantId });
      setTenantIdState(userTenantId || null);
    }
  }, [loading, isSys, userTenantId, tenantId]);

  // 3) Persistenz
  useEffect(() => {
    try {
      if (tenantId) localStorage.setItem('tenantId', tenantId);
      else localStorage.removeItem('tenantId');
    } catch {}
  }, [tenantId]);

  // 4) Navigation: Nicht-SysAdmins immer nach /tenant/:tenantId schieben
  useEffect(() => {
    if (loading) return;
    if (isSys) return;
    if (!tenantId) return; // Zeige dann deine "Kein Tenant zugeordnet" Seite

    const p = loc.pathname || '';
    const alreadyInThisTenant = new RegExp(`^/tenant/${tenantId}(/|$)`).test(p);
    if (!alreadyInThisTenant) {
      dlog('Redirect to tenant home', { tenantId, from: p });
      nav(`/tenant/${encodeURIComponent(tenantId)}`, { replace: true });
    }
  }, [loading, isSys, tenantId, loc.pathname, nav]);

  const setTenantId = (id) => {
    if (!canSwitchTenant) return;
    const trimmed = (id || '').trim();
    if (trimmed && !/^[a-zA-Z0-9_-]{2,64}$/.test(trimmed)) {
      alert('Ungültige Tenant-ID (a–Z, 0–9, _ , -, 2–64)');
      return;
    }
    dlog('setTenantId', trimmed || null);
    setTenantIdState(trimmed || null);
    if (trimmed) {
      nav(`/tenant/${encodeURIComponent(trimmed)}`, { replace: true });
    }
  };

  const clearTenantId = () => {
    if (!canSwitchTenant) return;
    dlog('clearTenantId');
    setTenantIdState(null);
  };

  // ────────────────────────────────────────────────────────────
  // Gruppen-Initialisierung (per Tenant)
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

    // SysAdmins oder kein Tenant → keine aktive Gruppe
    if (!tenantId || isSys) { setGroupIdState(null); return; }

    const persistKey = `groupId:${tenantId}`;

    // 1) gespeicherte Gruppe (wenn Mitglied)
    let next = null;
    try {
      const stored = localStorage.getItem(persistKey);
      if (stored && memberships.some(m => m.groupId === stored)) next = stored;
    } catch {}

    // 2) Default-Gruppe
    if (!next && user?.defaultGroupId) {
      const def = String(user.defaultGroupId);
      if (memberships.some(m => m.groupId === def)) next = def;
    }

    // 3) erste Mitgliedschaft
    if (!next && memberships.length > 0) next = memberships[0].groupId;

    dlog('Group select', { tenantId, chosen: next, memberships });
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
    dlog('setGroupId', gid);
    setGroupIdState(gid);
  };

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
