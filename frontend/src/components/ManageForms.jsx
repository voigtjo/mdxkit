import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  Tooltip,
  Stack,
  IconButton,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Divider,
  Container,
} from '@mui/material';
import { Link } from 'react-router-dom';
import SendIcon from '@mui/icons-material/Send';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { getForms } from '@/api/adminApi';
import {
  assignForm,
  getFormsByName,
  deleteFormAssignment,
  getAllFormData,
  reopenForm
} from '@/api/manageApi';
import { getPatients } from '@/api/patientApi';

const ManageForms = () => {
  const [forms, setForms] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [entries, setEntries] = useState([]);
  const [formDataList, setFormDataList] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const init = async () => {
      const f = await getForms();
      const p = await getPatients();
      const d = await getAllFormData();
      setForms(f || []);
      setPatients(p || []);
      setFormDataList(d || []);
    };
    init();
  }, []);

  const loadEntries = async (formName) => {
    if (!formName) return;
    const list = await getFormsByName(formName);
    setEntries(list || []);
  };

  const handleAssign = async () => {
    if (!selectedForm || !selectedPatient) return;
    await assignForm(selectedForm, selectedPatient);
    setMessage('✅ Formular zugewiesen');
    loadEntries(selectedForm);
    const updatedData = await getAllFormData();
    setFormDataList(updatedData || []);
  };

  const handleDelete = async (entryId) => {
    await deleteFormAssignment(entryId);
    setMessage('🗑️ Formularzuweisung gelöscht');
    loadEntries(selectedForm);
    const updatedData = await getAllFormData();
    setFormDataList(updatedData || []);
  };

  const handleReopen = async (entryId) => {
    try {
      await reopenForm(entryId);
      setMessage('🔁 Formular erneut freigegeben');
      const updatedData = await getAllFormData();
      setFormDataList(updatedData || []);
    } catch (err) {
      setMessage('❌ Fehler beim erneuten Freigeben');
    }
  };

  const getPatientName = (id) => {
    return patients.find((p) => p._id === id)?.name || id;
  };

  return (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      pt: 6,
      px: 4,
    }}
  >
    <Box sx={{ width: "100%", maxWidth: 1200 }}>
      <Button
        component={Link}
        to="/"
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Zurück
      </Button>

      <Typography variant="h4" gutterBottom>
        Formulare zuweisen
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={2}>
          {/* Formularauswahl */}
          <FormControl fullWidth>
            <InputLabel id="form-select-label">Formular</InputLabel>
            <Select
              labelId="form-select-label"
              value={selectedForm}
              label="Formular"
              onChange={(e) => {
                setSelectedForm(e.target.value);
                loadEntries(e.target.value);
              }}
            >
              {forms.map((f) => (
                <MenuItem key={f.name} value={f.name}>
                  {f.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Patientenauswahl */}
          <FormControl fullWidth>
            <InputLabel id="patient-select-label">Patient</InputLabel>
            <Select
              labelId="patient-select-label"
              value={selectedPatient}
              label="Patient"
              onChange={(e) => setSelectedPatient(e.target.value)}
            >
              {patients.map((p) => (
                <MenuItem key={p._id} value={p._id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Zuweisungsbutton */}
          <Tooltip title="Formular zuweisen">
            <span>
              <Button
                variant="contained"
                color="success"
                onClick={handleAssign}
                startIcon={<SendIcon />}
                disabled={!selectedForm || !selectedPatient}
              >
                Zuweisen
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Paper>

      {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}

      <Divider sx={{ my: 2 }} />

      <Typography variant="h5" gutterBottom>
        Zugewiesene Formulare
      </Typography>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Formularname</TableCell>
            <TableCell>Patientenname</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Updatedatum</TableCell>
            <TableCell>Aktion</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {formDataList.map((e) => (
            <TableRow key={e._id}>
              <TableCell>{e.formName}</TableCell>
              <TableCell>{getPatientName(e.patientId)}</TableCell>
              <TableCell>{e.status}</TableCell>
              <TableCell>{new Date(e.updatedAt).toLocaleString()}</TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Formular öffnen">
                    <Button
                      component={Link}
                      to={`/formular/${e.formName}/${e.patientId}`}
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
                      <IconButton
                        onClick={() => handleDelete(e._id)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  )}

                  {e.status === 'freigegeben' && (
                    <Tooltip title="Erneut freigeben">
                      <Button
                        onClick={() => handleReopen(e._id)}
                        color="warning"
                        variant="outlined"
                        size="small"
                      >
                        Freigeben
                      </Button>
                    </Tooltip>
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
