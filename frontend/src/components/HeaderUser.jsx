// src/components/HeaderUser.jsx
import React, { useMemo } from 'react';
import { Button, Chip, Stack, Typography } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useLocation, useNavigate } from 'react-router-dom';

const ROLE_LETTER = {
  FormAuthor: 'A',
  FormPublisher: 'P',
  Operator: 'O',
  FormDataEditor: 'E',
  FormDataApprover: 'R',
};

export default function HeaderUser() {
  const { user, doLogout } = useAuth();
  const { tenantId: ctxTid } = useTenant();
  const nav = useNavigate();
  const loc = useLocation();

  if (!user) return null;

  // ---- TenantId robust ermitteln ----
  const tid = useMemo(() => {
    const fromUser = user?.tenant?.tenantId || user?.tenantId || '';
    if (fromUser) return fromUser;
    if (ctxTid) return ctxTid;
    const m = (loc.pathname || '').match(/^\/tenant\/([^/]+)/);
    return m?.[1] || '';
  }, [user, ctxTid, loc.pathname]);

  // ---- aktive Gruppe aus URL (Public groupId) ----
  const activeGroupPublicId = useMemo(() => {
    const m = (loc.pathname || '').match(/\/group\/([^/]+)/);
    return m?.[1] || '';
  }, [loc.pathname]);

  // ---- Lookup der Gruppe + Rollen des Users in dieser Gruppe ----
  const { groupName, roleLetters } = useMemo(() => {
    const groups = Array.isArray(user?.groups) ? user.groups : [];
    const memberships = Array.isArray(user?.memberships) ? user.memberships : [];

    // Gruppe per Public-ID finden
    const g = activeGroupPublicId
      ? groups.find(x => x.groupId === activeGroupPublicId)
      : null;

    // Rollen ermitteln:
    // 1) direkter Match über membership.groupPublicId
    // 2) Fallback: membership.groupId (ObjectId) == g._id
    let roles = [];
    if (g) {
      const byPublic = memberships.find(m => m.groupPublicId === g.groupId);
      const byObject = !byPublic && memberships.find(m => String(m.groupId) === String(g._id));
      roles = (byPublic?.roles || byObject?.roles || []).filter(Boolean);
    }

    return {
      groupName: g?.name || g?.key || (activeGroupPublicId || '–'),
      roleLetters: roles.map(r => ROLE_LETTER[r] || '•'),
    };
  }, [user, activeGroupPublicId]);

  const roleTop =
    user.isSystemAdmin ? 'SysAdmin' :
    (user.isTenantAdmin ? 'TenantAdmin' : 'User');

  const roleChipColor =
    user.isSystemAdmin ? 'secondary' :
    (user.isTenantAdmin ? 'primary' : 'default');

  const alreadyOnTenant = tid && new RegExp(`^/tenant/${tid}(/|$)`).test(loc.pathname || '');
  const canJumpToTenant = !user.isSystemAdmin && !!tid && !alreadyOnTenant;
  const goTenant = () => nav(`/tenant/${encodeURIComponent(tid)}`);

  // Debug: einmal pro Render die relevanten Dinge ausgeben
  try {
    console.debug('[HeaderUser]', {
      email: user?.email,
      tenantId: tid,
      activeGroupId: activeGroupPublicId || null,
      rolesInGroup: roleLetters
    });
  } catch {}

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1, py: 1 }}>
      {user.email && <Typography variant="body2">{user.email}</Typography>}
      <Chip size="small" variant="outlined" label={`Tenant: ${tid || '–'}`} />
      {activeGroupPublicId && (
        <Chip size="small" variant="outlined" label={`Group: ${groupName}`} />
      )}
      <Chip size="small" color={roleChipColor} label={`Role: ${roleTop}`} />
      {roleLetters.length > 0 && (
        <Stack direction="row" spacing={0.5} alignItems="center">
          {roleLetters.map((L, i) => (
            <Chip key={`${L}-${i}`} size="small" label={L} />
          ))}
        </Stack>
      )}

      {canJumpToTenant && (
        <Button size="small" variant="outlined" onClick={goTenant}>
          Zum Tenant
        </Button>
      )}

      <Button
        size="small"
        variant="outlined"
        onClick={() => (window.location.href = '/account/change-password')}
      >
        Passwort ändern
      </Button>
      <Button size="small" variant="contained" color="secondary" onClick={doLogout}>
        Abmelden
      </Button>
    </Stack>
  );
}
