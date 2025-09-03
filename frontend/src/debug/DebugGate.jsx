// src/components/debug/DebugGate.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';

function flattenRoles(memberships = []) {
  const out = new Set();
  for (const m of memberships) (m?.roles || []).forEach(r => out.add(r));
  return Array.from(out);
}

export default function DebugGate({ forceEnable = false }) {
  const { user } = useAuth();
  const { tenantId: ctxTid, setTenantId, canSwitchTenant } = useTenant();
  const { tenantId: urlTid } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(() => {
    if (forceEnable) return true;
    return localStorage.getItem('debugUI') === '1';
  });

  // Hotkey: Backtick toggelt Panel
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === '`') {
        setOpen(v => {
          const next = !v;
          if (next) localStorage.setItem('debugUI', '1');
          else localStorage.removeItem('debugUI');
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const roles = useMemo(() => flattenRoles(user?.memberships), [user?.memberships]);

  const rows = [
    ['path', location.pathname],
    ['urlTid (:tenantId)', urlTid ?? '—'],
    ['ctxTid (TenantContext)', ctxTid ?? '—'],
    ['user.tenantId', user?.tenantId ?? '—'],
    ['isSysAdmin', String(!!user?.isSystemAdmin)],
    ['isTenantAdmin', String(!!user?.isTenantAdmin)],
    ['canSwitchTenant', String(!!canSwitchTenant)],
    ['roles', roles.length ? roles.join(', ') : '—'],
    ['email', user?.email ?? '—'],
  ];

  if (!open) return null;

  const go = (suffix) => {
    const tid = urlTid || ctxTid || user?.tenantId;
    if (!tid) return;
    navigate(`/tenant/${encodeURIComponent(tid)}${suffix}`);
  };

  const clearTenantLS = () => {
    localStorage.removeItem('tenantId');
  };

  const boxStyle = {
    position: 'fixed',
    right: 12,
    bottom: 12,
    zIndex: 9999,
    background: 'rgba(0,0,0,0.85)',
    color: '#e6f7ff',
    padding: '10px 12px',
    borderRadius: 8,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 12,
    minWidth: 320,
    maxWidth: 520,
    boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
  };

  const btnStyle = {
    background: '#0ea5e9',
    color: 'white',
    border: 0,
    borderRadius: 6,
    padding: '6px 10px',
    marginRight: 6,
    cursor: 'pointer',
    fontSize: 12,
  };

  const btnGhost = {
    ...btnStyle,
    background: 'transparent',
    color: '#93c5fd',
    border: '1px solid #334155',
  };

  return (
    <div style={boxStyle}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <strong style={{ fontSize: 13 }}>🔎 DebugGate</strong>
        <span style={{ marginLeft: 'auto', opacity: 0.8 }}>toggle: `</span>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: '3px 6px', color: '#a7f3d0', whiteSpace: 'nowrap' }}>{k}</td>
              <td style={{ padding: '3px 6px', color: '#e6f7ff' }}>{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        <button style={btnStyle} onClick={() => go('')}>Go Home</button>
        <button style={btnStyle} onClick={() => go('/admin')}>Go Admin</button>
        <button style={btnStyle} onClick={() => go('/manage')}>Go Manage</button>
        <button style={btnGhost} onClick={() => window.location.reload()}>Reload</button>
        <button style={btnGhost} onClick={clearTenantLS}>Clear tenantId (LS)</button>
      </div>
    </div>
  );
}
