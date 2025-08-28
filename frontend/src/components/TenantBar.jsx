// src/components/TenantBar.jsx
import React, { useEffect, useState } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';
import { useTenant } from '../context/TenantContext';
import { getActiveTenants } from '../api/tenantApi';

export default function TenantBar() {
  const { tenantId, setTenantId } = useTenant();
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getActiveTenants(); // [{tenantId, name}]
        if (mounted) setTenants(list || []);
      } catch (e) {
        console.error('❌ Tenants laden fehlgeschlagen:', e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (e) => {
    const id = e.target.value;
    setTenantId(id); // Auswahl übernimmt sofort
  };

  return (
    <Box
      sx={{
        bgcolor: '#e9f5ee', // leicht grün
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
