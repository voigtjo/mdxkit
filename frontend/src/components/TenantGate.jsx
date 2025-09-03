// src/components/TenantGate.jsx
import React, { useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';

/**
 * Hält tenantId in URL und Context synchron:
 * - Nicht-SysAdmins: erzwingt ihren user.tenantId in der URL (mit Suffix)
 * - SysAdmins: folgen Deep-Links; kein „breiter“ Auto-Redirect mehr, der Suffix verliert
 */
export default function TenantGate({ children }) {
  const { tenantId: urlTid } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantId: ctxTid, setTenantId } = useTenant();

  useEffect(() => {
    if (!user) return;

    const isSys = !!user.isSystemAdmin;
    const userTid = user.tenantId || null;

    // ===== 1) Nicht-SysAdmin → URL muss immer userTid tragen (Suffix erhalten) =====
    if (!isSys) {
      if (userTid) {
        // Suffix hinter /tenant/:tid erhalten
        const suffix = location.pathname.replace(/^\/tenant\/[^/]+/, '');
        // Wenn keine :tenantId in Params oder falsche → korrigieren
        if (!urlTid || urlTid !== userTid) {
          navigate(`/tenant/${encodeURIComponent(userTid)}${suffix || ''}${location.search}${location.hash}`, {
            replace: true,
          });
          return;
        }
        // Context absichern
        if (ctxTid !== userTid) setTenantId(userTid);
      }
      return;
    }

    // ===== 2) SysAdmin =====
    // a) Deep-Link: URL hat :tenantId → Context der URL folgen (kein Redirect)
    if (urlTid && ctxTid !== urlTid) {
      setTenantId(urlTid); // nur Context angleichen, NICHT navigieren
      return;
    }

    // b) Kein :tenantId in den Params:
    //    Früher: redirect auf /tenant/:ctxTid (hat /admin „abgeschnitten“).
    //    Jetzt: nur dann, wenn es wirklich eine Landing ist (z.B. '/').
    if (!urlTid && ctxTid) {
      // Bereits auf einer /tenant/*-Route? Dann NICHT eingreifen.
      if (location.pathname.startsWith('/tenant/')) return;

      // Nur eindeutige Landing-Fälle automatisch auf Tenant-Home schicken:
      if (location.pathname === '/' || location.pathname === '' || location.pathname === '/home') {
        navigate(`/tenant/${encodeURIComponent(ctxTid)}`, { replace: true });
      }
      // Sonst: nichts tun (keine Navigation, kein Verlust eines Suffixes)
    }
  }, [user, urlTid, ctxTid, location.pathname, location.search, location.hash, navigate, setTenantId]);

  return <>{children}</>;
}
