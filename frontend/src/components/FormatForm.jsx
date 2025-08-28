import React, { useEffect, useState } from 'react';
import {
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
import { useLocation, Link, useParams } from 'react-router-dom';

import { getFormats, uploadFormat, releaseFormat } from '@/api/formatApi';
import { getPrints, uploadPrint, releasePrint } from '@/api/printApi';
import { useTenant } from '@/context/TenantContext';

const FormatForm = () => {
  const location = useLocation();
  const { tenantId: tenantFromUrl } = useParams();
  const { tenantId: tenantFromCtx } = useTenant();
  const tid = tenantFromUrl || tenantFromCtx || '';

  const isPrint = location.pathname.includes('/print');
  const label = isPrint ? 'Druckvorlage' : 'Formatvorlage';

  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');

  const loadTemplates = async () => {
    try {
      const list = isPrint ? await getPrints() : await getFormats();
      setTemplates(list || []);
    } catch (err) {
      console.error(`❌ Fehler beim Laden der ${label}n`, err);
    }
  };

  const handleUpload = async () => {
    if (!name.trim() || !text.trim()) return;
    try {
      const res = isPrint
        ? await uploadPrint(name.trim(), text)
        : await uploadFormat(name.trim(), text);

      setMessage(`✅ ${label} ${res.mode === 'update' ? 'aktualisiert' : 'gespeichert'}`);
      setSelectedId(res.id);
      await loadTemplates();
    } catch (err) {
      console.error(`❌ Fehler beim Speichern der ${label}`, err);
      setMessage('❌ Fehler beim Speichern');
    }
  };

  const handleRelease = async () => {
    if (!selectedId) return;
    try {
      if (isPrint) {
        await releasePrint(selectedId);
      } else {
        await releaseFormat(selectedId);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrint]);

  const backLink = tid ? `/tenant/${encodeURIComponent(tid)}` : '/';

  return (
    <Container maxWidth="lg">
      {/* 🔙 Tenant-bewusster Zurück-Button */}
      <Button
        component={Link}
        to={backLink}
        variant="outlined"
        sx={{ mb: 2 }}
      >
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
