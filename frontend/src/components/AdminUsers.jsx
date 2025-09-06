// src/components/AdminUsers.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography, Tooltip, Chip, FormControl,
  InputLabel, Select, MenuItem, OutlinedInput
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, DeleteOutline } from '@mui/icons-material';
import { getUsers, createUser, updateUser, deleteUser, getUserById } from '@/api/userApi';
import { listGroups } from '@/api/groupApi';
import { listRoles } from '@/api/roleApi';
import { useTenant } from '@/context/TenantContext';

const emptyForm = {
  displayName: '',
  email: '',
  isTenantAdmin: false,
  memberships: [],
  defaultGroupId: null,
};

const ROLE_TO_INITIAL = {
  FormAuthor: 'A',
  FormPublisher: 'P',
  Operator: 'O',
  FormDataEditor: 'E',
  FormDataApprover: 'R',
};
const ROLE_ORDER = ['FormAuthor','FormPublisher','Operator','FormDataEditor','FormDataApprover'];

function roleChipsForUser(user) {
  const roles = new Set();
  (user?.memberships || []).forEach(m => (m.roles || []).forEach(r => roles.add(r)));
  const sorted = Array.from(roles).sort((a,b) => ROLE_ORDER.indexOf(a) - ROLE_ORDER.indexOf(b));
  return sorted.map(r => ({
    key: r,
    initial: ROLE_TO_INITIAL[r] || (r?.[0]?.toUpperCase() || '?'),
    title: r,
  }));
}

export default function AdminUsers() {
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

  const [groups, setGroups] = useState([]); // {_id, name}
  const [roles, setRoles] = useState([]);   // {key, name}

  const load = async () => {
    setLoading(true);
    try {
      const [usersData, groupsData, rolesData] = await Promise.all([
        getUsers(), listGroups(tid), listRoles()
      ]);
      setRows(usersData);
      setGroups(groupsData);
      setRoles(rolesData.filter(r => r.status !== 'deleted'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (tid) load(); /* eslint-disable-next-line */ }, [tid]);

  const groupOptions = useMemo(() => groups.map(g => ({ value: g._id, label: g.name })), [groups]);
  const groupsById = useMemo(() => {
    const map = {};
    (groups || []).forEach(g => { map[String(g._id)] = g; });
    return map;
  }, [groups]);

  const roleOptions  = useMemo(() => roles.map(r => ({ value: r.key, label: r.name || r.key })), [roles]);

  const title = useMemo(() => editingId ? 'User bearbeiten' : 'Neuen User anlegen', [editingId]);

  const onOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  };

  const onOpenEdit = async (row) => {
    setEditingId(row._id);
    setError('');
    try {
      const detail = await getUserById(row._id);
      setForm({
        displayName: detail.displayName || detail.name || '',
        email: detail.email || '',
        isTenantAdmin: !!detail.isTenantAdmin,
        memberships: Array.isArray(detail.memberships) ? detail.memberships : [],
        defaultGroupId: detail.defaultGroupId || null,
      });
      setOpen(true);
    } catch (e) {
      console.error(e);
      alert('User-Details konnten nicht geladen werden.');
    }
  };

  const onClose = () => setOpen(false);

  const ensureDefaultGroupValid = (memberships, defaultGroupId) => {
    if (!defaultGroupId) return null;
    const has = (memberships || []).some(m => String(m.groupId) === String(defaultGroupId));
    return has ? defaultGroupId : null;
  };

  const onSave = async () => {
    try {
      if (!form.displayName || form.displayName.trim().length < 2) {
        setError('Bitte einen Anzeigenamen mit mind. 2 Zeichen angeben.');
        return;
      }
      const memberships = (form.memberships || []).map(m => ({
        groupId: m.groupId,
        roles: Array.from(new Set(m.roles || []))
      }));
      const defaultGroupId = ensureDefaultGroupValid(memberships, form.defaultGroupId);

      const payload = {
        displayName: form.displayName.trim(),
        email: (form.email || '').trim(),
        isTenantAdmin: !!form.isTenantAdmin,
        memberships,
        defaultGroupId
      };

      if (editingId) {
        await updateUser(editingId, payload);
      } else {
        await createUser(payload);
      }
      setOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      setError(e.response?.data?.error || e.message);
    }
  };

  const onDelete = async (row) => {
    if (!window.confirm(`User „${row.name || row.displayName}“ wirklich löschen?`)) return;
    try {
      await deleteUser(row._id);
      await load();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || e.message);
    }
  };

  const addMembership = () => {
    setForm(f => {
      const remaining = groupOptions.filter(go => !(f.memberships || []).some(m => m.groupId === go.value));
      const first = remaining[0];
      if (!first) return f;
      const next = { ...(f), memberships: [...(f.memberships || []), { groupId: first.value, roles: [] }] };
      if (!next.defaultGroupId) next.defaultGroupId = first.value;
      return next;
    });
  };
  const removeMembership = (groupId) => {
    setForm(f => {
      const memberships = (f.memberships || []).filter(m => m.groupId !== groupId);
      const defaultGroupId = f.defaultGroupId === groupId ? (memberships[0]?.groupId || null) : f.defaultGroupId;
      return { ...f, memberships, defaultGroupId };
    });
  };
  const setMembershipGroup = (idx, groupId) => {
    setForm(f => {
      const memberships = [...(f.memberships || [])];
      memberships[idx] = { ...memberships[idx], groupId };
      const defaultGroupId = ensureDefaultGroupValid(memberships, f.defaultGroupId) || groupId;
      return { ...f, memberships, defaultGroupId };
    });
  };
  const setMembershipRoles = (idx, rolesArr) => {
    setForm(f => {
      const memberships = [...(f.memberships || [])];
      memberships[idx] = { ...memberships[idx], roles: rolesArr };
      return { ...f, memberships };
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h5">Benutzerverwaltung</Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Rollen-Kürzel: A=Author, P=Publisher, O=Operator, E=Editor, R=Release">
            <Chip size="small" label="A/P/O/E/R" />
          </Tooltip>
          <Button variant="outlined" onClick={() => navigate(`/tenant/${tid}/admin`)}>Zurück</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={onOpenCreate}>Neu</Button>
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Users können mehreren Gruppen angehören; je Gruppe werden Rollen zugewiesen. Die Default-Gruppe bestimmt die
        angemeldete Arbeitsgruppe.
      </Typography>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>E-Mail</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Default-Gruppe</TableCell>
              <TableCell>Rollen</TableCell>
              <TableCell>TenantAdmin</TableCell>
              <TableCell align="right" style={{ width: 140 }}>Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => {
              const defName = r.defaultGroupId
                ? (groupsById[String(r.defaultGroupId)]?.name || '—')
                : '—';
              const chips = roleChipsForUser(r);

              return (
                <TableRow key={r._id} hover>
                  <TableCell>{r.displayName || r.name || '—'}</TableCell>
                  <TableCell>{r.email || '—'}</TableCell>
                  <TableCell><Chip size="small" label={r.status || 'active'} /></TableCell>
                  <TableCell>{defName}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
                      {chips.length === 0 ? (
                        <Chip size="small" variant="outlined" label="—" />
                      ) : chips.map(c => (
                        <Tooltip key={c.key} title={c.title}>
                          <Chip size="small" label={c.initial} />
                        </Tooltip>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>{r.isTenantAdmin ? <Chip size="small" label="yes" /> : <Chip size="small" label="no" />}</TableCell>
                  <TableCell align="right">
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
              );
            })}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary">Keine Benutzer vorhanden.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog */}
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Anzeigename"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              fullWidth
              autoFocus
            />
            <TextField
              label="E-Mail (optional)"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel id="default-group-label">Default-Gruppe</InputLabel>
              <Select
                labelId="default-group-label"
                label="Default-Gruppe"
                value={form.defaultGroupId || ''}
                onChange={(e) => setForm((f) => ({ ...f, defaultGroupId: e.target.value }))}
              >
                {(form.memberships || []).map((m) => {
                  const g = groupOptions.find(go => go.value === m.groupId);
                  return <MenuItem key={m.groupId} value={m.groupId}>{g?.label || m.groupId}</MenuItem>;
                })}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="tenant-admin-label">TenantAdmin</InputLabel>
              <Select
                labelId="tenant-admin-label"
                label="TenantAdmin"
                value={form.isTenantAdmin ? 'yes' : 'no'}
                onChange={(e) => setForm((f) => ({ ...f, isTenantAdmin: e.target.value === 'yes' }))}
              >
                <MenuItem value="no">no</MenuItem>
                <MenuItem value="yes">yes</MenuItem>
              </Select>
            </FormControl>

            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1">Gruppen-Zugehörigkeiten</Typography>
                <Button size="small" onClick={addMembership}>+ Gruppe hinzufügen</Button>
              </Stack>

              {(form.memberships || []).map((m, idx) => {
                const availableGroups = groups.map(g => ({ value: g._id, label: g.name }));
                return (
                  <Paper key={idx} variant="outlined" sx={{ p: 1.5 }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <FormControl sx={{ minWidth: 240 }}>
                          <InputLabel id={`group-${idx}-label`}>Gruppe</InputLabel>
                          <Select
                            labelId={`group-${idx}-label`}
                            label="Gruppe"
                            value={m.groupId || ''}
                            onChange={(e) => setMembershipGroup(idx, e.target.value)}
                          >
                            {availableGroups.map(g => (
                              <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <Button variant="outlined" color="error" onClick={() => removeMembership(m.groupId)}>
                          Entfernen
                        </Button>
                      </Stack>

                      <FormControl fullWidth disabled={roleOptions.length === 0}>
                        <InputLabel id={`roles-${idx}-label`}>Rollen</InputLabel>
                        <Select
                          labelId={`roles-${idx}-label`}
                          multiple
                          value={m.roles || []}
                          onChange={(e) => setMembershipRoles(idx, e.target.value)}
                          input={<OutlinedInput label="Rollen" />}
                          renderValue={(selected) => (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {(selected || []).map(role => {
                                const label = roleOptions.find(ro => ro.value === role)?.label || role;
                                return <Chip key={role} size="small" label={label} />;
                              })}
                            </Stack>
                          )}
                        >
                          {roleOptions.map(ro => (
                            <MenuItem key={ro.value} value={ro.value}>{ro.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>

            {error && <Typography color="error">{error}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="contained" onClick={onSave}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
