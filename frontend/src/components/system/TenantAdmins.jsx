// src/components/system/TenantAdmins.jsx
import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Stack, Typography, Button, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, FormControl, InputLabel, Select, MenuItem, Alert
} from '@mui/material';
import { Add as AddIcon, DeleteOutline, Block, CheckCircle, PersonRemove } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { listAllTenants } from '@/api/tenantApi';
import { listTenantAdmins, inviteTenantAdmin, setTenantAdminStatus, revokeTenantAdmin, deleteTenantAdmin } from '@/api/tenantAdminApi';

export default function TenantAdmins() {
  const nav = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [tenantId, setTenantId] = useState('');
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', displayName: '' });
  const [info, setInfo] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await listAllTenants();
        if (!mounted) return;
        setTenants(list || []);
        const stored = localStorage.getItem('tenantAdmins.selectedTenant');
        const initial = stored && (list || []).some(t => t.tenantId === stored)
          ? stored
          : (list?.[0]?.tenantId || '');
        setTenantId(initial);
      } catch {
        setErr('Konnte Tenants nicht laden.');
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!tenantId) { setRows([]); return; }
    localStorage.setItem('tenantAdmins.selectedTenant', tenantId);
    let mounted = true;
    (async () => {
      try {
        setErr('');
        const list = await listTenantAdmins(tenantId);
        if (mounted) setRows(list || []);
      } catch {
        if (mounted) setErr('Konnte Tenant-Admins nicht laden.');
      }
    })();
    return () => { mounted = false; };
  }, [tenantId]);

  const reload = async () => {
    if (!tenantId) return;
    const list = await listTenantAdmins(tenantId);
    setRows(list || []);
  };

  const onInvite = async () => {
    try {
      const r = await inviteTenantAdmin(tenantId, form);
      setInfo(`Eingeladen: ${r.email} – TempPW: ${r.tempPassword}`);
      setOpen(false);
      setForm({ email: '', displayName: '' });
      await reload();
    } catch (e) {
      alert(e?.response?.data?.error || e?.message || 'Fehler bei Einladung');
    }
  };

  const onSuspend = async (id) => { await setTenantAdminStatus(tenantId, id, 'suspended'); await reload(); };
  const onActivate = async (id) => { await setTenantAdminStatus(tenantId, id, 'active'); await reload(); };
  const onRevoke   = async (id) => { await revokeTenantAdmin(tenantId, id); await reload(); };
  const onDelete   = async (id) => {
    if (!window.confirm('Wirklich löschen?')) return;
    await deleteTenantAdmin(tenantId, id); await reload();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Tenant-Administratoren</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => nav('/system')}>Zurück</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} disabled={!tenantId}>
            Einladen
          </Button>
        </Stack>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      {info && <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel id="tenant-select-label">Tenant wählen</InputLabel>
          <Select
            labelId="tenant-select-label"
            value={tenantId}
            label="Tenant wählen"
            onChange={(e) => setTenantId(e.target.value)}
          >
            {tenants.map((t) => (
              <MenuItem key={t.tenantId} value={t.tenantId}>
                {t.name} ({t.tenantId})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Flags</TableCell>
              <TableCell align="right" width={260}>Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r._id} hover>
                <TableCell>{r.displayName || '—'}</TableCell>
                <TableCell>{r.email}</TableCell>
                <TableCell><Chip size="small" label={r.status} /></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    {r.isTenantAdmin && <Chip size="small" color="secondary" label="TenantAdmin" />}
                    {r.mustChangePassword && <Chip size="small" color="warning" label="Passwort ändern" />}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  {r.status === 'active'
                    ? <Tooltip title="Sperren"><IconButton onClick={() => onSuspend(r._id)}><Block /></IconButton></Tooltip>
                    : <Tooltip title="Aktivieren"><IconButton onClick={() => onActivate(r._id)}><CheckCircle /></IconButton></Tooltip>
                  }
                  <Tooltip title="Admin-Recht entziehen">
                    <IconButton onClick={() => onRevoke(r._id)}><PersonRemove /></IconButton>
                  </Tooltip>
                  <Tooltip title="Löschen">
                    <IconButton color="error" onClick={() => onDelete(r._id)}><DeleteOutline /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={5}>Keine Admins für diesen Tenant.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Tenant-Admin einladen</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField label="Tenant" value={tenantId} InputProps={{ readOnly: true }} />
          <TextField label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <TextField label="Anzeigename" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={onInvite} disabled={!tenantId}>Einladen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
