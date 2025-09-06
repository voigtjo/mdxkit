import React, { useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';

/**
 * Hält tenantId in URL und Context synchron:
 * - Nicht-SysAdmins: erzwingt ihren user.tenantId in der URL (mit Suffix)
 * - SysAdmins: folgen Deep-Links; kein „breiter“ Auto-Redirect mehr
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

    if (!isSys) {
      if (userTid) {
        const suffix = location.pathname.replace(/^\/tenant\/[^/]+/, '');
        if (!urlTid || urlTid !== userTid) {
          navigate(`/tenant/${encodeURIComponent(userTid)}${suffix || ''}${location.search}${location.hash}`, {
            replace: true,
          });
          return;
        }
        if (ctxTid !== userTid) setTenantId(userTid);
      }
      return;
    }

    if (urlTid && ctxTid !== urlTid) {
      setTenantId(urlTid);
      return;
    }

    if (!urlTid && ctxTid) {
      if (location.pathname.startsWith('/tenant/')) return;
      if (location.pathname === '/' || location.pathname === '' || location.pathname === '/home') {
        navigate(`/tenant/${encodeURIComponent(ctxTid)}`, { replace: true });
      }
    }
  }, [user, urlTid, ctxTid, location.pathname, location.search, location.hash, navigate, setTenantId]);

  return <>{children}</>;
}
