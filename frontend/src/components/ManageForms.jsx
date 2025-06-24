import React, { useEffect, useState } from 'react';
import { getForms } from '@/api/adminApi';
import { assignForm, getFormsByName, deleteFormAssignment } from '@/api/manageApi';
import { getPatients } from '@/api/patientApi';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  Stack,
  IconButton
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';

const ManageForms = () => {
  const [forms, setForms] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState('');

  const loadForms = async () => {
    try {
      const list = await getForms();
      setForms(Array.isArray(list) ? list : []);
    } catch {
      setForms([]);
    }
  };

  const loadPatients = async () => {
    try {
      const list = await getPatients();
      setPatients(Array.isArray(list) ? list : []);
    } catch {
      setPatients([]);
    }
  };

  const loadEntries = async (formName) => {
    const list = await getFormsByName(formName);
    setEntries(Array.isArray(list) ? list : []);
  };

  const handleAssign = async () => {
    if (!selectedForm || !selectedPatient) return;
    await assignForm(selectedForm, selectedPatient);
    setMessage('✅ Formular zugewiesen');
    loadEntries(selectedForm);
  };

  const handleDelete = async (entryId) => {
    await deleteFormAssignment(entryId);
    setMessage('🗑️ Formularzuweisung gelöscht');
    loadEntries(selectedForm);
  };

  useEffect(() => {
    loadForms();
    loadPatients();
  }, []);

  const getPatientName = (id) => {
    return patients.find((p) => p._id === id)?.name || id;
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Manage: Formulare zuweisen
      </Typography>

      <Box display="flex" gap={2} mb={4}>
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
      </Box>

      {message && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      <Typography variant="h5" gutterBottom>
        Zugewiesene Formulare
      </Typography>
      <List>
        {entries.map((e) => (
          <ListItem
            key={e._id}
            divider
            secondaryAction={
              <Stack direction="row" spacing={1}>
                <Tooltip title="Formular öffnen">
                  <Button
                    component={Link}
                    to={`/formular-eingabe/${e.formName}/${e.patientId}`}
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
              </Stack>
            }
          >
            <ListItemText
              primary={`Patient: ${getPatientName(e.patientId)}`}
              secondary={`Formular: ${e.formName} – Status: ${e.status}`}
            />
          </ListItem>
        ))}
      </List>
    </Container>
  );
};

export default ManageForms;