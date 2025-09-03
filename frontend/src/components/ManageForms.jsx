// src/components/ManageForms.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Box, Typography, FormControl, InputLabel, Select,
  MenuItem, Button, Alert, Tooltip, Stack, IconButton,
  Table, TableHead, TableRow, TableCell, TableBody,
  Paper, Divider,
} from '@mui/material';
import { Link } from 'react-router-dom';
import SendIcon from '@mui/icons-material/Send';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { getAvailableForms } from '@/api/formApi';
import {
  assignForm, getFormsByName, deleteFormAssignment,
  getAllFormData, reopenForm, acceptForm,
} from '@/api/manageApi';
import { useTenant } from '@/context/TenantContext';
import { getUsers } from '@/api/userApi';
import usePerms, { PERMS as P } from '@/hooks/usePerms';

const ManageForms = () => {
  const { loading: authLoading, user } = useAuth();
  const { tenantId } = useTenant();

  const { can } = usePerms();
  const canEdit = can(P.FORMDATA_EDIT);

  const [forms, setForms] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [entries, setEntries] = useState([]);
  const [formDataList, setFormDataList] = useState([]);
  const [message, setMessage] = useState('');

  // ⬅️ Beim Tenant-Wechsel lokalen Zustand leeren, damit keine „alten“ Daten kurz sichtbar sind
  useEffect(() => {
    setForms([]);
    setUsers([]);
    setSelectedForm('');
    setSelectedUser('');
    setEntries([]);
    setFormDataList([]);
    setMessage('');
  }, [tenantId]);

  // ⬅️ Daten laden: jetzt abhängig von tenantId
  useEffect(() => {
    if (authLoading || !user || !tenantId) return;
    const init = async () => {
      try {
        const [f, u, d] = await Promise.all([
          getAvailableForms(), // tenant-scope (Backend-Pfad nutzt :tenantId)
          getUsers(),          // tenant-scope
          getAllFormData(),    // tenant-scope
        ]);
        setForms(f || []);
        setUsers(u || []);
        setFormDataList(d || []);
      } catch (e) {
        console.error('❌ Initial-Load (ManageForms) fehlgeschlagen:', e);
      }
    };
    init();
  }, [authLoading, user, tenantId]);

  const loadEntries = async (formName) => {
    if (!formName) return;
    try {
      const list = await getFormsByName(formName);
      setEntries(list || []);
    } catch (e) {
      console.error('❌ getFormsByName fehlgeschlagen:', e);
    }
  };

  const refreshAllData = async () => {
    try {
      const updatedData = await getAllFormData();
      setFormDataList(updatedData || []);
      if (selectedForm) await loadEntries(selectedForm);
    } catch (e) {
      console.error('❌ refreshAllData fehlgeschlagen:', e);
    }
  };

  const handleAssign = async () => {
    if (!selectedForm || !selectedUser) return;
    await assignForm(selectedForm, selectedUser); // Backend erwartet patientId
    setMessage('✅ Formular zugewiesen');
    await refreshAllData();
  };

  const handleDelete = async (entryId) => {
    await deleteFormAssignment(entryId);
    setMessage('🗑️ Formularzuweisung gelöscht');
    await refreshAllData();
  };

  const handleReopen = async (entryId) => {
    try {
      await reopenForm(entryId);
      setMessage('🔁 Formular erneut zugewiesen');
      await refreshAllData();
    } catch {
      setMessage('❌ Fehler beim erneuten Zuweisen');
    }
  };

  const handleAccept = async (entryId) => {
    try {
      await acceptForm(entryId);
      setMessage('✅ Formular akzeptiert (abgeschlossen)');
      await refreshAllData();
    } catch {
      setMessage('❌ Fehler beim Akzeptieren');
    }
  };

  const getUserName = (id) => users.find((u) => u._id === id)?.name || id;

  if (authLoading || !tenantId) {
    return <Box sx={{ p: 4 }}><Alert severity="info">Lade…</Alert></Box>;
  }

  return !canEdit ? (
    <Box sx={{ p: 4 }}>
      <Alert severity="warning">Keine Berechtigung für diesen Bereich.</Alert>
    </Box>
  ) : (
    <Box
      sx={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', pt: 6, px: 4 }}
    >
      <Box sx={{ width: '100%', maxWidth: 1200 }}>
        <Button
          component={Link}
          to={tenantId ? `/tenant/${encodeURIComponent(tenantId)}` : '/'}
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Zurück
        </Button>

        <Typography variant="h4" gutterBottom>Formulare zuweisen</Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="form-select-label">Formular</InputLabel>
              <Select
                labelId="form-select-label"
                value={selectedForm}
                label="Formular"
                onChange={(e) => { setSelectedForm(e.target.value); loadEntries(e.target.value); }}
              >
                {forms.map((f) => (
                  <MenuItem key={f.name} value={f.name}>{f.title || f.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="user-select-label">Nutzer</InputLabel>
              <Select
                labelId="user-select-label"
                value={selectedUser}
                label="Nutzer"
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                {users.map((u) => (
                  <MenuItem key={u._id} value={u._id}>{u.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Tooltip title="Formular zuweisen">
              <span>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleAssign}
                  startIcon={<SendIcon />}
                  disabled={!canEdit || !selectedForm || !selectedUser}
                >
                  Zuweisen
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Paper>

        {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}

        <Divider sx={{ my: 2 }} />

        <Typography variant="h5" gutterBottom>Zugewiesene Formulare</Typography>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Formularname</TableCell>
              <TableCell>Nutzername</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Updatedatum</TableCell>
              <TableCell>Aktion</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {formDataList.map((e) => (
              <TableRow key={e._id}>
                <TableCell>
                  {e.formName}{' '}
                  <Typography component="span" variant="caption" color="text.secondary">
                    (v{e.version})
                  </Typography>
                </TableCell>
                <TableCell>{getUserName(e.patientId)}</TableCell>
                <TableCell>{e.status}</TableCell>
                <TableCell>{new Date(e.updatedAt).toLocaleString()}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title="Formular öffnen">
                      <Button
                        component={Link}
                        to={`/tenant/${tenantId}/formular/${e.formName}/${e.patientId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined"
                        startIcon={<OpenInNewIcon />}
                        size="small"
                      >
                        Öffnen
                      </Button>
                    </Tooltip>

                    {e.status === 'offen' && (
                      <Tooltip title="Löschen">
                        <span>
                          <IconButton onClick={() => handleDelete(e._id)} color="error" size="small" disabled={!canEdit}>
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}

                    {e.status === 'freigegeben' && (
                      <>
                        <Tooltip title="Erneut zuweisen">
                          <span>
                            <Button onClick={() => handleReopen(e._id)} color="warning" variant="outlined" size="small" disabled={!canEdit}>
                              Erneut zuweisen
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title="Akzeptieren (abschließen)">
                          <span>
                            <Button onClick={() => handleAccept(e._id)} color="primary" variant="contained" size="small" startIcon={<CheckCircleIcon />} disabled={!canEdit}>
                              Akzeptieren
                            </Button>
                          </span>
                        </Tooltip>
                      </>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};

export default ManageForms;
