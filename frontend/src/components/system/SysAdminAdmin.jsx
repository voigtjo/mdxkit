import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Stack, Typography, Button, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Table, TableHead, TableRow, TableCell, TableBody, Chip
} from '@mui/material';
import { Add as AddIcon, DeleteOutline, Block, CheckCircle } from '@mui/icons-material';
import { SecurityUpdateWarning as ShieldOff } from '@mui/icons-material';
import { listSysAdmins, inviteSysAdmin, setSysAdminStatus, revokeSysAdmin, deleteSysAdmin } from '@/api/sysAdminApi';
import { useNavigate } from 'react-router-dom';

export default function SysAdminAdmin() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', displayName: '' });
  const [info, setInfo] = useState('');

  const load = async () => {
    try {
      const list = await listSysAdmins();
      setRows(list || []);
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => { load(); }, []);

  const onInvite = async () => {
    try {
      const r = await inviteSysAdmin(form);
      setInfo(`Eingeladen: ${r.email} – TempPW: ${r.tempPassword}`);
      setOpen(false);
      setForm({ email: '', displayName: '' });
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || 'Fehler bei Einladung');
    }
  };

  const onSuspend = async (id) => { await setSysAdminStatus(id, 'suspended'); await load(); };
  const onActivate = async (id) => { await setSysAdminStatus(id, 'active'); await load(); };
  const onRevoke = async (id) => { await revokeSysAdmin(id); await load(); };
  const onDelete  = async (id) => {
    if (!window.confirm('Wirklich löschen?')) return;
    await deleteSysAdmin(id); await load();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">System-Administratoren</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => nav('/system')}>← Zurück</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Einladen</Button>
        </Stack>
      </Stack>

      {info && <Typography sx={{ mb: 2 }} color="secondary">{info}</Typography>}

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
                    {r.isSystemAdmin && <Chip size="small" color="secondary" label="SysAdmin" />}
                    {r.mustChangePassword && <Chip size="small" color="warning" label="Passwort ändern" />}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  {r.status === 'active'
                    ? <Tooltip title="Sperren"><IconButton onClick={() => onSuspend(r._id)}><Block /></IconButton></Tooltip>
                    : <Tooltip title="Aktivieren"><IconButton onClick={() => onActivate(r._id)}><CheckCircle /></IconButton></Tooltip>
                  }
                  <Tooltip title="SysAdmin entziehen">
                    <IconButton onClick={() => onRevoke(r._id)}><ShieldOff /></IconButton>
                  </Tooltip>
                  <Tooltip title="Löschen">
                    <IconButton color="error" onClick={() => onDelete(r._id)}><DeleteOutline /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={5}>Keine SysAdmins gefunden.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>SysAdmin einladen</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <TextField label="Anzeigename" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={onInvite}>Einladen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
