import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Switch, TextField, Typography, IconButton, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, DeleteOutline, CheckCircle, Block } from '@mui/icons-material';
import { listAllTenants, createTenant, setTenantStatus, updateTenant } from '../../api/tenantApi';

export default function TenantAdmin() {
  const [items, setItems] = useState([]);
  const [showSuspended, setShowSuspended] = useState(false);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ tenantId: '', name: '' });

  const load = async () => {
    setLoading(true);
    try {
      const all = await listAllTenants();
      setItems(all || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return (items || []).filter(t => showSuspended ? true : t.status === 'active');
  }, [items, showSuspended]);

  const onNew = () => {
    setEditMode(false);
    setForm({ tenantId: '', name: '' });
    setOpen(true);
  };

  const onEdit = (t) => {
    setEditMode(true);
    setForm({ tenantId: t.tenantId, name: t.name });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!form.tenantId || !/^[a-zA-Z0-9_-]{2,64}$/.test(form.tenantId)) {
        alert('Ungültige tenantId (a–Z, 0–9, _ , -, 2–64)'); return;
      }
      if (!form.name) { alert('Name erforderlich'); return; }

      if (editMode) {
        await updateTenant(form.tenantId, { name: form.name });
      } else {
        await createTenant({ tenantId: form.tenantId, name: form.name });
      }
      setOpen(false);
      load();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || 'Fehler beim Speichern');
    }
  };

  const softDelete = async (tenantId) => {
    if (!window.confirm(`Tenant "${tenantId}" wirklich (soft) löschen? Er wird suspendiert.`)) return;
    await setTenantStatus(tenantId, 'suspended');
    load();
  };

  const activate = async (tenantId) => {
    await setTenantStatus(tenantId, 'active');
    load();
  };

  const suspend = async (tenantId) => {
    await setTenantStatus(tenantId, 'suspended');
    load();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Tenant-Administration</Typography>
        <FormControlLabel
          control={<Switch checked={showSuspended} onChange={(e) => setShowSuspended(e.target.checked)} />}
          label="auch gesperrte anzeigen"
        />
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={onNew}>Neuen Tenant anlegen</Button>
      </Box>

      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={220}>Tenant-ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell width={140}>Status</TableCell>
              <TableCell align="right" width={260}>Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(t => (
              <TableRow key={t.tenantId} hover>
                <TableCell><code>{t.tenantId}</code></TableCell>
                <TableCell>{t.name}</TableCell>
                <TableCell>
                  {t.status === 'active'
                    ? <Chip icon={<CheckCircle />} color="success" label="aktiv" size="small" />
                    : <Chip icon={<Block />} color="warning" label="gesperrt" size="small" />
                  }
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Bearbeiten">
                    <IconButton onClick={() => onEdit(t)}><EditIcon /></IconButton>
                  </Tooltip>
                  {t.status === 'active' ? (
                    <Tooltip title="Sperren">
                      <IconButton onClick={() => suspend(t.tenantId)}><Block /></IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Reaktivieren">
                      <IconButton onClick={() => activate(t.tenantId)}><CheckCircle /></IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Soft-Delete (suspendieren)">
                    <IconButton onClick={() => softDelete(t.tenantId)} color="error">
                      <DeleteOutline />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={4}><Typography variant="body2">Keine Tenants gefunden.</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editMode ? 'Tenant bearbeiten' : 'Neuen Tenant anlegen'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField
            label="Tenant-ID"
            value={form.tenantId}
            onChange={(e) => setForm(f => ({ ...f, tenantId: e.target.value.trim() }))}
            InputProps={{ readOnly: editMode }}
            helperText="a–Z, 0–9, _ , -, 2–64"
            required
          />
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
