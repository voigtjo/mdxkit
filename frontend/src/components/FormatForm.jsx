import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const FormatForm = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isPrint = location.pathname.includes('/print');
  const basePath = isPrint ? '/api/admin/prints' : '/api/admin/formats';
  const label = isPrint ? 'Druckvorlage' : 'Formatvorlage';

  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');

  const loadTemplates = async () => {
    try {
      const res = await axios.get(basePath);
      setTemplates(res.data);
    } catch (err) {
      console.error(`❌ Fehler beim Laden der ${label}n`, err);
    }
  };

  const handleUpload = async () => {
    if (!name.trim() || !text.trim()) return;
    try {
      const res = await axios.post(basePath, { name: name.trim(), text });
      setMessage(`✅ ${label} ${res.data.mode === 'update' ? 'aktualisiert' : 'gespeichert'}`);
      setSelectedId(res.data.id);
      await loadTemplates();
    } catch (err) {
      console.error(`❌ Fehler beim Speichern der ${label}`, err);
      setMessage('❌ Fehler beim Speichern');
    }
  };

  const handleRelease = async () => {
    if (!selectedId) return;
    try {
      await axios.put(`${basePath}/release/${selectedId}`);
      setMessage(`✅ ${label} freigegeben`);
      await loadTemplates();
    } catch (err) {
      console.error(`❌ Fehler beim Freigeben der ${label}`, err);
      setMessage('❌ Fehler beim Freigeben');
    }
  };

  const handleLoad = (tpl) => {
    setName(tpl.name);
    setText(tpl.text);
    setSelectedId(tpl._id);
    setMessage(`🔄 ${label} "${tpl.name}" geladen`);
  };

  const handleClear = () => {
    setName('');
    setText('');
    setSelectedId(null);
    setMessage('🧹 Felder geleert – neue Vorlage kann erstellt werden');
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  return (
    <Container maxWidth="lg">
      <Button variant="outlined" onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        ← Zurück
      </Button>

      <Typography variant="h4" gutterBottom>
        {label} bearbeiten
      </Typography>

      {message && (
        <Typography variant="body1" color="secondary" sx={{ mb: 2 }}>
          {message}
        </Typography>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Button onClick={handleClear}>Leeren</Button>
          <Button variant="contained" onClick={handleUpload}>Speichern</Button>
          <Button
            variant="outlined"
            onClick={handleRelease}
            disabled={!selectedId}
          >
            Freigeben
          </Button>
        </Stack>

        <TextField
          label={`${label} Name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label={`${label} Inhalt (Markdown oder JSON)`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          minRows={10}
          fullWidth
        />
      </Paper>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h5" gutterBottom>
        Bestehende {label}n
      </Typography>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Geändert</TableCell>
            <TableCell>Aktion</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {templates.map((tpl) => (
            <TableRow key={tpl._id} selected={tpl._id === selectedId}>
              <TableCell>{tpl.name}</TableCell>
              <TableCell>{tpl.status}</TableCell>
              <TableCell>
                {tpl.updatedAt ? new Date(tpl.updatedAt).toLocaleString() : '–'}
              </TableCell>
              <TableCell>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleLoad(tpl)}
                >
                  Laden
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
};

export default FormatForm;
