import React, { useEffect, useMemo, useState } from 'react';
import { Button, Chip, Stack, Typography, FormControl, Select, MenuItem, InputLabel } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { listGroups } from '@/api/groupApi';

export default function HeaderUser() {
  const { user, doLogout } = useAuth();
  const { tenantId, groupId, setGroupId, userMemberships } = useTenant();

  const [groupNames, setGroupNames] = useState({}); // id -> name

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!tenantId) { setGroupNames({}); return; }
      try {
        const list = await listGroups(tenantId); // [{_id,name}, ...]
        if (!alive) return;
        const map = {};
        (list || []).forEach(g => { map[String(g._id)] = g.name || String(g._id); });
        setGroupNames(map);
      } catch {
        if (alive) setGroupNames({});
      }
    }
    load();
    return () => { alive = false; };
  }, [tenantId]);

  const membershipOptions = useMemo(() => {
    const ids = (userMemberships || []).map(m => m.groupId);
    return ids.map(id => ({ value: id, label: groupNames[id] || id }));
  }, [userMemberships, groupNames]);

  if (!user) return null;

  const handleLogout = async () => {
    try {
      await doLogout();
    } catch {
      try {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tenantId');
      } catch {}
      window.location.href = '/';
    }
  };

  const tenantLabel = user?.tenantName || user?.tenantId || tenantId;

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {/* Tenant */}
      {tenantLabel && (
        <Chip size="small" variant="outlined" label={`Tenant: ${tenantLabel}`} />
      )}

      {/* Gruppe (nur wenn der Nutzer Gruppen hat) */}
      {membershipOptions.length > 0 && (
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="group-switcher-label">Gruppe</InputLabel>
          <Select
            labelId="group-switcher-label"
            label="Gruppe"
            value={groupId || ''}
            onChange={(e) => setGroupId(e.target.value || null)}
          >
            {membershipOptions.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Typography variant="body2">{user.email}</Typography>
      {user.isSystemAdmin && <Chip size="small" color="secondary" label="SysAdmin" />}
      {user.isTenantAdmin && <Chip size="small" color="primary" label="TenantAdmin" />}

      <Button
        size="small"
        variant="outlined"
        onClick={() => (window.location.href = '/account/change-password')}
      >
        Passwort ändern
      </Button>

      <Button
        size="small"
        variant="contained"
        color="secondary"
        onClick={handleLogout}
      >
        Abmelden
      </Button>
    </Stack>
  );
}
