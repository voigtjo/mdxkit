// src/components/RoleVisible.jsx
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useGroup } from '@/context/GroupContext';
import { Alert, Box, Button, Stack } from '@mui/material';
import { Link } from 'react-router-dom';

export default function GroupGate({ children }) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const { groupId: routeGroupPublicId } = useGroup(); // Public-ID aus URL/Context

  if (!user) return null;

  // Admins dürfen den Group-Scope immer betreten.
  if (user.isSystemAdmin || user.isTenantAdmin) {
    return children;
  }

  const groups = Array.isArray(user?.groups) ? user.groups : [];
  const memberships = Array.isArray(user?.memberships) ? user.memberships : [];

  // Gruppe aus DTO (damit wir _id (ObjectId) ↔ public groupId mappen können)
  const g = routeGroupPublicId
    ? groups.find(x => x.groupId === routeGroupPublicId)
    : null;

  const isMember =
    !!routeGroupPublicId &&
    (
      // 1) direkte Public-ID im Membership (falls vorhanden)
      memberships.some(m => m.groupPublicId === routeGroupPublicId) ||
      // 2) Fallback: Membership.groupId (ObjectId) entspricht der Gruppe._id
      (!!g && memberships.some(m => String(m.groupId) === String(g._id)))
    );

  if (!tenantId || !routeGroupPublicId || !isMember) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Kein Zugriff – Sie sind in dieser Gruppe nicht Mitglied.
        </Alert>
        {tenantId && (
          <Stack direction="row" spacing={1}>
            <Button component={Link} to={`/tenant/${encodeURIComponent(tenantId)}`} variant="outlined">
              Zur Tenant-Übersicht
            </Button>
          </Stack>
        )}
      </Box>
    );
  }

  return children;
}
