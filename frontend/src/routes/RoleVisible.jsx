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
    isSysAdmin ||
    isTenantAdminHere ||
    hasAnyRole(allow);

  return ok ? children : fallback;
}
