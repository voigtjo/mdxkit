import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Stack, Typography, Button, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Alert, CircularProgress
} from '@mui/material';
import { Add as AddIcon, DeleteOutline, Block, CheckCircle } from '@mui/icons-material';
import { SecurityUpdateWarning as ShieldOff } from '@mui/icons-material';
import { listSysAdmins, inviteSysAdmin, setSysAdminStatus, revokeSysAdmin, deleteSysAdmin } from '@/api/sysAdminApi';
import { useNavigate } from 'react-router-dom';

const isProd = import.meta?.env?.MODE === 'production' || process.env.NODE_ENV === 'production';
const dlog = (...a) => { if (!isProd) console.debug('[SysAdminAdmin]', ...a); };

export default function SysAdminAdmin() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', displayName: '' });
  const [info, setInfo] = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const list = await listSysAdmins();
      setRows(Array.isArray(list) ? list : []);
      dlog('loaded', { count: (list || []).length });
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Laden fehlgeschlagen';
      setErr(msg);
      dlog('load error', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onInvite = async () => {
    setErr('');
    setInfo('');
    try {
      if (!form.email.trim()) {
        setErr('E-Mail ist erforderlich.');
        return;
      }
      const r = await inviteSysAdmin({ email: form.email.trim(), displayName: form.displayName.trim() });
      const temp = r?.tempPassword ? ` – TempPW: ${r.tempPassword}` : '';
      setInfo(`Eingeladen: ${r?.email || form.email}${temp}`);
      setOpen(false);
      setForm({ email: '', displayName: '' });
      await load();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Fehler bei Einladung';
      setErr(msg);
    }
  };

  const onSuspend = async (id) => {
    try { await setSysAdminStatus(id, 'suspended'); await load(); } catch (e) { alert(e?.response?.data?.error || 'Fehler beim Sperren'); }
  };
  const onActivate = async (id) => {
    try { await setSysAdminStatus(id, 'active'); await load(); } catch (e) { alert(e?.response?.data?.error || 'Fehler beim Aktivieren'); }
  };
  const onRevoke = async (id) => {
    try { await revokeSysAdmin(id); await load(); } catch (e) { alert(e?.response?.data?.error || 'Fehler beim Entziehen'); }
  };
  const onDelete  = async (id) => {
    if (!window.confirm('Wirklich löschen?')) return;
    try { await deleteSysAdmin(id); await load(); } catch (e) { alert(e?.response?.data?.error || 'Fehler beim Löschen'); }
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

      {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Paper>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : (
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
                <TableRow key={r._id || r.id || r.email} hover>
                  <TableCell>{r.displayName || '—'}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell><Chip size="small" label={r.status || 'active'} /></TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {r.isSystemAdmin && <Chip size="small" color="secondary" label="SysAdmin" />}
                      {r.mustChangePassword && <Chip size="small" color="warning" label="Passwort ändern" />}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    {r.status === 'active'
                      ? <Tooltip title="Sperren"><IconButton onClick={() => onSuspend(r._id || r.id)}><Block /></IconButton></Tooltip>
                      : <Tooltip title="Aktivieren"><IconButton onClick={() => onActivate(r._id || r.id)}><CheckCircle /></IconButton></Tooltip>
                    }
                    <Tooltip title="SysAdmin entziehen">
                      <IconButton onClick={() => onRevoke(r._id || r.id)}><ShieldOff /></IconButton>
                    </Tooltip>
                    <Tooltip title="Löschen">
                      <IconButton color="error" onClick={() => onDelete(r._id || r.id)}><DeleteOutline /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow><TableCell colSpan={5}>Keine SysAdmins gefunden.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>SysAdmin einladen</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField
            label="Email"
            value={form.email}
            type="email"
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          />
          <TextField
            label="Anzeigename"
            value={form.displayName}
            onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={onInvite}>Einladen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
