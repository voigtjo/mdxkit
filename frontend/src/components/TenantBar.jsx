import React, { useEffect, useState } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';
import { useTenant } from '@/context/TenantContext';
import { getActiveTenants } from '@/api/tenantApi';
import { useLocation, useNavigate } from 'react-router-dom';

export default function TenantBar() {
  const { tenantId, setTenantId, canSwitchTenant } = useTenant();
  const [tenants, setTenants] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!canSwitchTenant) {
        if (mounted) setTenants([]);
        return;
      }
      try {
        const list = await getActiveTenants(); // [{ tenantId, name }]
        if (mounted) setTenants(list || []);
      } catch {
        if (mounted) setTenants([]);
      }
    })();
    return () => { mounted = false; };
  }, [canSwitchTenant]);

  // Nur SysAdmin sieht die linke (grüne) Leiste
  if (!canSwitchTenant) return null;

  const replaceTenantInPath = (pathname, newTid) => {
    const m = pathname.match(/^\/tenant\/([^/]+)(\/.*)?$/);
    if (m) {
      const suffix = m[2] || '';
      return `/tenant/${encodeURIComponent(newTid)}${suffix}`;
    }
    return `/tenant/${encodeURIComponent(newTid)}`;
  };

  const handleChange = (e) => {
    const newTid = e.target.value;

    // 1) Context setzen
    setTenantId(newTid);

    // 2) Persistieren – wird von Backend-Middleware/Interceptors genutzt
    try { localStorage.setItem('tenantId', newTid); } catch {}

    // 3) gleiche Route beibehalten, nur :tenantId ersetzen → triggert alle useParams-/useEffect-Ketten
    const newPath = replaceTenantInPath(location.pathname, newTid);
    navigate(newPath, { replace: false });
  };

  return (
    <Box
      sx={{
        bgcolor: '#e9f5ee',
        borderBottom: '1px solid #cfe8db',
        px: 2,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Mandant:
      </Typography>

      <FormControl size="small" sx={{ minWidth: 220 }}>
        <InputLabel id="tenant-select-label">Tenant wählen</InputLabel>
        <Select
          labelId="tenant-select-label"
          value={tenantId || ''}
          label="Tenant wählen"
          onChange={handleChange}
        >
          {tenants.map((t) => (
            <MenuItem key={t.tenantId} value={t.tenantId}>
              {t.name} ({t.tenantId})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
