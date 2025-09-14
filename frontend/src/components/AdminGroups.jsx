import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Tooltip, Chip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, DeleteOutline } from '@mui/icons-material';
import { listGroups, createGroup, updateGroup, deleteGroup, listGroupMembers } from '@/api/groupApi';
import { useTenant } from '@/context/TenantContext';

const emptyForm = { key: '', name: '', description: '' };

export default function AdminGroups() {
  const { tenantId: tenantFromUrl } = useParams();
  const { tenantId: tenantFromCtx } = useTenant();
  const navigate = useNavigate();
  const tid = tenantFromUrl || tenantFromCtx || '';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const [membersOpen, setMembersOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersGroupName, setMembersGroupName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await listGroups(tid);
      setRows(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (tid) load(); }, [tid]); // eslint-disable-line

  const title = useMemo(() => editingId ? 'Gruppe bearbeiten' : 'Neue Gruppe anlegen', [editingId]);

  const onOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  };

  const onOpenEdit = (row) => {
    setEditingId(row._id);
    setForm({ key: row.key, name: row.name, description: row.description || '' });
    setError('');
    setOpen(true);
  };

  const onClose = () => setOpen(false);

  const onSave = async () => {
    try {
      if (!form.key || !/^[a-z0-9][a-z0-9-_]+$/.test(form.key)) {
        setError('Bitte einen gültigen Schlüssel angeben (z. B. "ops-team").');
        return;
      }
      if (!form.name || form.name.trim().length < 2) {
        setError('Bitte einen Namen mit mind. 2 Zeichen angeben.');
        return;
      }
      const payload = {
        key: form.key.trim(),
        name: form.name.trim(),
        description: (form.description || '').trim(),
        status: 'active',
      };
      if (editingId) {
        await updateGroup(tid, editingId, payload);
      } else {
        await createGroup(tid, payload);
      }
      setOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.error || e.message);
    }
  };

  const onDelete = async (row) => {
    if (!window.confirm(`Gruppe „${row.name}“ wirklich löschen?`)) return;
    try {
      await deleteGroup(tid, row._id);
      await load();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.error || e.message);
    }
  };

  const onShowMembers = async (row) => {
    try {
      const data = await listGroupMembers(tid, row._id);
      setMembersGroupName(row.name);
      setMembers(data);
      setMembersOpen(true);
    } catch (e) {
      console.error(e);
      alert('Members konnten nicht geladen werden.');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5">Gruppen</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate(`/tenant/${tid}`)}>Zurück</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onOpenCreate}>Neu</Button>
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Gruppen bündeln Benutzer. Rollen werden <strong>nicht</strong> an Gruppen hinterlegt, sondern den
        Benutzer-Mitgliedschaften je Gruppe zugewiesen.
      </Typography>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Key</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right" style={{ width: 220 }}>Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r._id} hover>
                <TableCell><code>{r.key}</code></TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell><Chip size="small" label={r.status || 'active'} /></TableCell>
                <TableCell align="right">
                  <Tooltip title="Mitglieder anzeigen">
                    <Button size="small" onClick={() => onShowMembers(r)}>Members</Button>
                  </Tooltip>
                  <Tooltip title="Bearbeiten">
                    <IconButton onClick={() => onOpenEdit(r)} size="small"><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Löschen">
                    <IconButton onClick={() => onDelete(r)} size="small" color="error">
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">Keine Gruppen vorhanden.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Key (z. B. ops-team)"
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              fullWidth
              disabled={Boolean(editingId)}
            />
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Beschreibung"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            {error && <Typography color="error">{error}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="contained" onClick={onSave}>Speichern</Button>
        </DialogActions>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={membersOpen} onClose={() => setMembersOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Mitglieder – {membersGroupName}</DialogTitle>
        <DialogContent dividers>
          {members.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Keine Mitglieder.</Typography>
          ) : (
            <Stack spacing={1}>
              {members.map(m => (
                <Stack key={m._id} direction="row" spacing={1} alignItems="center">
                  <Chip label={m.name} />
                  <Typography variant="body2" color="text.secondary">{m.email}</Typography>
                  {Array.isArray(m.roles) && m.roles.length > 0 && (
                    <Typography variant="body2" color="text.secondary">– Rollen: {m.roles.join(', ')}</Typography>
                  )}
                </Stack>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMembersOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
