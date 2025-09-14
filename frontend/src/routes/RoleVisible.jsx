import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

/**
 * Gate, das anhand von Rollen rendert.
 * - SysAdmin: immer erlaubt
 * - "TenantAdmin": hängt an user.isTenantAdmin
 * - sonst: Rollen der AKTIVEN GRUPPE (TenantContext.groupRoles)
 */
export default function RoleVisible({ allow = [], children, fallback = null }) {
  const { user } = useAuth();
  const { groupRoles } = useTenant();

  if (!user) return fallback;

  // SysAdmin darf immer
  if (user.isSystemAdmin) return children;

  // Wenn explizit TenantAdmin erlaubt ist
  if (allow.includes('TenantAdmin') && user.isTenantAdmin) return children;

  // Gruppenrollen prüfen
  const roles = Array.isArray(groupRoles) ? groupRoles : [];
  const ok = allow.length === 0 || allow.some(r => roles.includes(r));

  if (ok) return children;

  // Fallback mit Info
  return (
    <div style={{ padding: 16 }}>
      <p style={{ color: '#b91c1c', fontWeight: 600, marginBottom: 8 }}>Kein Zugriff</p>
      <p style={{ margin: 0 }}>
        Benötigte Rollen: {allow.length ? allow.join(', ') : '—'}
        <br />
        Deine Rollen (aktive Gruppe): {roles.length ? roles.join(', ') : '—'}
      </p>
    </div>
  );
}
