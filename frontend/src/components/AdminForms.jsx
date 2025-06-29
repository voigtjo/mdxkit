import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 hinzufügen
import {
  Box,
  Typography,
  TextField,
  Button,
  Container,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Stack,
  Divider,
} from '@mui/material';
import {
  getForms,
  uploadForm,
  releaseFormVersion,
  lockFormVersion,
  getFormVersionText,
} from '@/api/adminApi';

const AdminForms = () => {
  const navigate = useNavigate(); // 👈 initialisieren

  const [forms, setForms] = useState([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [message, setMessage] = useState('');

  const loadForms = async () => {
    const list = await getForms();
    setForms(list || []);
  };

const handleUpload = async () => {
  if (!name || !text) return;
  try {
    const res = await uploadForm(name, text);
    setMessage(`✅ Formular gespeichert (Version ${res.version})`);

    setSelectedVersion(res.version); // Setze die gespeicherte Version als aktiv

    // Lade den Text der gespeicherten Version erneut
    const form = await getFormVersionText(name, res.version);
    setText(form.text);

    await loadForms(); // Tabelle aktualisieren
  } catch (err) {
    setMessage('❌ Fehler beim Hochladen');
    console.error(err);
  }
};


  const handleRelease = async () => {
    if (!name || !selectedVersion) return;
    try {
      await releaseFormVersion(name, selectedVersion);
      setMessage(`✅ Version ${selectedVersion} veröffentlicht`);
      await loadForms();
    } catch (err) {
      setMessage('❌ Fehler beim Freigeben');
      console.error(err);
    }
  };

  const handleLock = async () => {
    if (!name || !selectedVersion) return;
    try {
      await lockFormVersion(name, selectedVersion);
      setMessage(`🚫 Version ${selectedVersion} gesperrt`);
      await loadForms();
    } catch (err) {
      setMessage('❌ Fehler beim Sperren');
      console.error(err);
    }
  };

  const handleLoad = async (formName, version) => {
    try {
      const form = await getFormVersionText(formName, version);
      setName(formName);
      setText(form.text);
      setSelectedVersion(version);
      setMessage(`📝 Version ${version} von "${formName}" geladen`);
    } catch (err) {
      console.error('❌ Fehler beim Laden:', err);
      setMessage('❌ Fehler beim Laden der Version');
    }
  };

  const handleClear = () => {
    setName('');
    setText('');
    setSelectedVersion(null);
    setMessage('🧹 Formularfelder geleert');
  };

  useEffect(() => {
    loadForms();
  }, []);

  return (
    <Container maxWidth="lg">
        <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        ← Zurück
      </Button>
      <Typography variant="h4" gutterBottom>
        Formular bearbeiten
      </Typography>

      {selectedVersion !== null && (
      <Typography variant="body1" sx={{ mb: 2 }} color="secondary">
        Version {selectedVersion} von "{name}" geladen – Gültig:{' '}
        {forms.find(f => f.name === name)?.validVersion === selectedVersion ? 'Ja' : 'Nein'} – Letztes Update:{' '}
        {forms.find(f => f.name === name)?.updatedAt
          ? new Date(forms.find(f => f.name === name).updatedAt).toLocaleString()
          : '–'}
      </Typography>
    )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Button variant="outlined" color="inherit" onClick={handleClear}>
            Leeren
          </Button>
          <Button variant="contained" color="primary" onClick={handleUpload}>
            Speichern
          </Button>
          <Button variant="outlined" color="success" onClick={handleRelease}>
            Freigeben
          </Button>
          <Button variant="outlined" color="error" onClick={handleLock}>
            Sperren
          </Button>
        </Stack>

        <TextField
          label="Formularname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />

        <TextField
          label="Formulartext (Markdown)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          minRows={6}
          fullWidth
        />
      </Paper>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h5" gutterBottom>
        Aktive Formulare
      </Typography>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Formularname</TableCell>
            <TableCell>Gültige Version</TableCell>
            <TableCell>Arbeits-Version</TableCell>
            <TableCell>Arbeits-Version gültig?</TableCell>
            <TableCell>Updatedatum</TableCell>
            <TableCell>Aktion</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {forms.map((f, i) => (
            <TableRow
              key={i}
              selected={f.name === name && (f.validVersion === selectedVersion || f.currentVersion === selectedVersion)}
            >
              <TableCell>{f.name}</TableCell>
              <TableCell>{f.validVersion || '–'}</TableCell>
              <TableCell>{f.currentVersion || '–'}</TableCell>
              <TableCell>
                {f.validVersion === f.currentVersion ? 'ja' : 'nein'}
              </TableCell>
              <TableCell>
                {f.updatedAt ? new Date(f.updatedAt).toLocaleString() : '–'}
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleLoad(f.name, f.validVersion)}
                    disabled={!f.validVersion}
                  >
                    Lade gültig
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleLoad(f.name, f.currentVersion)}
                    disabled={!f.currentVersion}
                  >
                    Lade aktuell
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
};

export default AdminForms;
