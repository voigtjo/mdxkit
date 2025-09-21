// src/context/GroupContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

const GroupCtx = createContext(null);
export const useGroup = () => useContext(GroupCtx);

/**
 * Speichert/liest die aktuell aktive Gruppe je Tenant separat.
 * Key: groupId::<tenantId>
 */
function storageKey(tenantId) {
  return tenantId ? `groupId::${tenantId}` : 'groupId';
}

export default function GroupProvider({ children }) {
  const { user } = useAuth();
  const { tenantId } = useTenant();

  const [groupId, setGroupId] = useState(null);

  // Initial: aus URL (/tenant/:tid/group/:gid), sonst LocalStorage, sonst DefaultGroup des Users
  useEffect(() => {
    // Versuche URL zu lesen
    const m = window.location.pathname.match(/^\/tenant\/([^/]+)\/group\/([^/]+)/);
    const gidFromPath = m?.[2] || null;

    if (gidFromPath) {
      setGroupId(gidFromPath);
      try { localStorage.setItem(storageKey(tenantId), gidFromPath); } catch {}
      return;
    }

    if (!tenantId) return;

    // LS → Default → Erste Mitgliedschaft
    let ls = null;
    try { ls = localStorage.getItem(storageKey(tenantId)); } catch {}
    if (ls) { setGroupId(ls); return; }

    const memberships = user?.memberships || [];
    const defaultGid = user?.defaultGroupId || null;
    const first = memberships[0]?.groupId || null;

    const pick = defaultGid || first || null;
    setGroupId(pick);
    if (pick) {
      try { localStorage.setItem(storageKey(tenantId), pick); } catch {}
    }
  }, [tenantId, user]);

  const setActiveGroup = (gid) => {
    const next = gid || null;
    setGroupId(next);
    try {
      if (next) localStorage.setItem(storageKey(tenantId), next);
      else localStorage.removeItem(storageKey(tenantId));
    } catch {}
  };

  const rolesInActiveGroup = useMemo(() => {
    if (!user || !groupId) return [];
    const m = (user.memberships || []).find(x => String(x.groupId) === String(groupId));
    return Array.isArray(m?.roles) ? m.roles : [];
  }, [user, groupId]);

  const value = useMemo(() => ({
    groupId,
    setGroupId: setActiveGroup,
    rolesInActiveGroup,
  }), [groupId, rolesInActiveGroup]);

  return <GroupCtx.Provider value={value}>{children}</GroupCtx.Provider>;
}
