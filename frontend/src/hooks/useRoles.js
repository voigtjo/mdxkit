// src/hooks/useRoles.js
import { useAuth } from '@/context/AuthContext';
import { useParams } from 'react-router-dom';

/**
 * Effektive Rollen + Admin-Override.
 * - Rollen werden als Union über alle memberships[*].roles gebaut.
 * - isTenantAdmin gilt nur im aktuellen :tenantId.
 */
export function useRoles() {
  const { user, loading } = useAuth();
  const { tenantId } = useParams();

  const memberships = Array.isArray(user?.memberships) ? user.memberships : [];
  const roleSet = new Set();
  for (const m of memberships) {
    if (Array.isArray(m.roles)) {
      for (const r of m.roles) roleSet.add(r);
    }
  }

  const isSysAdmin = !!user?.isSystemAdmin;
  const isTenantAdmin =
    !!user?.isTenantAdmin &&
    (!!tenantId ? String(user?.tenantId) === String(tenantId) : true);

  const hasAnyRole = (allow = []) => allow.some(r => roleSet.has(r));

  return {
    user,
    loading,
    tenantId,
    roles: roleSet,
    isSysAdmin,
    isTenantAdmin,
    hasAnyRole,
  };
}
