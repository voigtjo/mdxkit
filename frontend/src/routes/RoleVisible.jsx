// src/routes/RoleVisible.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useRoles } from '@/hooks/useRoles';

export default function RoleVisible({ allow = [], children, fallback = null }) {
  const { user } = useAuth();
  const { tenantId } = useParams();
  const { loading, isSysAdmin, isTenantAdmin, hasAnyRole } = useRoles();

  if (loading) return null;
  if (!user) return null;

  const isTenantAdminHere =
    !!isTenantAdmin &&
    !!user?.tenantId &&
    !!tenantId &&
    String(user.tenantId) === String(tenantId);

  const ok =
    isSysAdmin ||            // SysAdmin: immer
    isTenantAdminHere ||     // TenantAdmin: im eigenen Tenant
    hasAnyRole(allow);

  // --- DEBUG-LOGGING ---
/*   console.groupCollapsed('[RoleVisible]');
  console.log('Pfad-TenantId:', tenantId);
  console.log('User:', user);
  console.log('isSysAdmin:', isSysAdmin);
  console.log('isTenantAdmin:', isTenantAdmin);
  console.log('isTenantAdminHere:', isTenantAdminHere);
  console.log('allow:', allow);
  console.log('hasAnyRole(allow):', hasAnyRole(allow));
  console.log('ok (entscheidend):', ok);
  console.groupEnd(); */

  return ok ? children : fallback;
}
