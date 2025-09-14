// frontend/src/components/system/TenantAdmin.jsx
import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Stack, Typography, Button, TextField, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, IconButton, Tooltip, Divider
} from '@mui/material';
import { Add as AddIcon, Edit, Save, Cancel, CheckCircle, Block } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { listAllTenants, createTenant, updateTenant, setTenantStatus } from '@/api/tenantApi';

export default function TenantAdmin() {
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [creating, setCreating] = useState({ tenantId: '', name: '' });
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const load = async () => {
    try {
      setErr('');
      const rows = await listAllTenants();
      setList(rows || []);
    } catch (e) {
      setErr('Konnte Tenants nicht laden.');
    }
  };
  useEffect(() => { load(); }, []);

  const onCreate = async () => {
    setInfo(''); setErr('');
    try {
      if (!creating.tenantId || !creating.name) {
        setErr('Bitte tenantId und Name angeben.');
        return;
      }
      await createTenant({ tenantId: creating.tenantId, name: creating.name });
      setCreating({ tenantId: '', name: '' });
      setInfo('Tenant angelegt.');
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Fehler beim Anlegen.');
    }
  };

  const startEdit = (t) => {
    setEditingId(t.tenantId);
    setEditName(t.name);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };
  const saveEdit = async (t) => {
    try {
      await updateTenant(t.tenantId, { name: editName });
      setInfo('Gespeichert.');
      cancelEdit();
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Fehler beim Speichern.');
    }
  };

  const toggleStatus = async (t) => {
    try {
      const next = t.status === 'active' ? 'suspended' : 'active';
      await setTenantStatus(t.tenantId, next);
      setInfo(`Status: ${next}`);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.error || e?.message || 'Fehler beim Statuswechsel.');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Mandantenverwaltung</Typography>
        <Button variant="outlined" onClick={() => nav('/system')}>Zurück</Button>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      {info && <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert>}

      {/* Anlegen (inline, kein Dialog) */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Neuen Tenant anlegen</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="tenantId"
            size="small"
            value={creating.tenantId}
            onChange={e => setCreating(c => ({ ...c, tenantId: e.target.value }))}
            helperText="a–Z, 0–9, -, _"
          />
          <TextField
            label="Name"
            size="small"
            value={creating.name}
            onChange={e => setCreating(c => ({ ...c, name: e.target.value }))}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
            Anlegen
          </Button>
        </Stack>
      </Paper>

      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tenant</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right" width={220}>Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.map(t => (
              <TableRow key={t.tenantId} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography>{t.tenantId}</Typography>
                    <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                    <Button
                      size="small"
                      onClick={() => {
                        localStorage.setItem('tenantAdmins.selectedTenant', t.tenantId);
                        nav('/system/tenants/admins');
                      }}
                    >
                      Admins verwalten
                    </Button>
                  </Stack>
                </TableCell>

                <TableCell>
                  {editingId === t.tenantId ? (
                    <TextField size="small" value={editName} onChange={e => setEditName(e.target.value)} />
                  ) : (
                    t.name
                  )}
                </TableCell>

                <TableCell>
                  <Chip size="small" label={t.status || 'active'} />
                </TableCell>

                <TableCell align="right">
                  {editingId === t.tenantId ? (
                    <>
                      <Tooltip title="Speichern">
                        <IconButton onClick={() => saveEdit(t)}><Save /></IconButton>
                      </Tooltip>
                      <Tooltip title="Abbrechen">
                        <IconButton onClick={cancelEdit}><Cancel /></IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Tooltip title="Bearbeiten">
                        <IconButton onClick={() => startEdit(t)}><Edit /></IconButton>
                      </Tooltip>
                      {t.status === 'active' ? (
                        <Tooltip title="Sperren">
                          <span><IconButton onClick={() => toggleStatus(t)}><Block /></IconButton></span>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Aktivieren">
                          <span><IconButton onClick={() => toggleStatus(t)}><CheckCircle /></IconButton></span>
                        </Tooltip>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {list.length === 0 && (
              <TableRow><TableCell colSpan={4}>Keine Tenants vorhanden.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
