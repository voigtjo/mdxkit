// src/components/AdminForms.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  OutlinedInput,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

import {
  getForms,
  uploadForm,
  releaseFormVersion,
  lockFormVersion,
  getFormVersionText,
  assignTemplatesToForm,
} from '@/api/adminApi';
import { getFormats } from '@/api/formatApi';
import { getPrints } from '@/api/printApi';
import { useTenant } from '@/context/TenantContext';

// Sichtbarkeits-API (global / gruppen)
import { getAvailableForms, updateFormMeta } from '@/api/formApi';
// Gruppenliste für Labeling & Auswahl
import { listGroups } from '@/api/groupApi';

const AdminForms = () => {
  const navigate = useNavigate();
  const { tenantId: tenantFromUrl } = useParams();
  const { tenantId: tenantFromCtx } = useTenant();
  const tid = tenantFromUrl || tenantFromCtx || '';

  const [forms, setForms] = useState([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [message, setMessage] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(false);

  const [formats, setFormats] = useState([]);
  const [prints, setPrints] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [selectedPrint, setSelectedPrint] = useState('');

  // Gruppen für Sichtbarkeit
  const [groups, setGroups] = useState([]);

  // Dialog-Status für Sichtbarkeit
  const [visOpen, setVisOpen] = useState(false);
  const [visEditing, setVisEditing] = useState(null); // {_id, name, title, isGlobal, groupIds}
  const [visIsGlobal, setVisIsGlobal] = useState(true);
  const [visGroupIds, setVisGroupIds] = useState([]);
  const [visError, setVisError] = useState('');

  const loadForms = async () => {
    // 1) Admin-Formliste (Versionen, Templates, etc.)
    // 2) Sichtbarkeits-Meta via /form/available (liefert isGlobal/groupIds + _id)
    const [list, available] = await Promise.all([
      getForms(),
      getAvailableForms(), // als Admin kommt hier der komplette Bestand zurück (serverseitige Policy)
    ]);

    const visByName = new Map((available || []).map(f => [f.name, f]));
    const merged = (list || []).map(f => {
      const v = visByName.get(f.name);
      return {
        // zuerst _id aus Adminliste, Fallback aus /available
        _id: f._id || v?._id,
        ...f,
        isGlobal: v?.isGlobal ?? true,
        groupIds: v?.groupIds ?? [],
        status: v?.status ?? f.status,
      };
    });

    setForms(merged);
  };

  const loadTemplates = async () => {
    const [formats, printList] = await Promise.all([getFormats(), getPrints()]);
    setFormats(formats);
    setPrints(printList);
  };

  const loadGroups = async () => {
    try {
      const data = await listGroups();
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const getFormatName = (id) => {
    const match = formats.find(f => f._id === id);
    return match ? match.name : '–';
  };

  const getPrintName = (id) => {
    const match = prints.find(p => p._id === id);
    return match ? match.name : '–';
  };

  const groupOptions = useMemo(
    () => groups.map(g => ({ value: g._id, label: g.name })),
    [groups]
  );

  const labelForGroup = (id) => groupOptions.find(go => go.value === id)?.label || id;

  const handleUpload = async () => {
    if (!name || !text) return;
    try {
      const res = await uploadForm(name, text);
      const { version, mode } = res;

      const msg = mode === 'update'
        ? `🔁 Version ${version} von "${name}" wurde aktualisiert`
        : `🆕 Neue Version ${version} von "${name}" gespeichert`;

      setMessage(`✅ ${msg}`);
      setSelectedVersion(version);

      const form = await getFormVersionText(name, version);
      setText(form.text);
      await loadForms();
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

  const handleAssignTemplates = async () => {
    if (!name) return;
    try {
      await assignTemplatesToForm(name, selectedFormat || null, selectedPrint || null);
      setMessage('✅ Vorlagen zugewiesen');
      await loadForms();
    } catch (err) {
      console.error('❌ Fehler beim Zuweisen:', err);
      setMessage('❌ Fehler beim Zuweisen der Vorlagen');
    }
  };

  const handleLoad = async (formName, version, mode = 'auto') => {
    try {
      const form = await getFormVersionText(formName, version);
      setName(formName);
      setText(form.text);
      setSelectedVersion(version);

      const meta = forms.find((f) => f.name === formName);

      const isReadonly = mode === 'valid';
      setIsReadOnly(isReadonly);
      setSelectedFormat(meta?.formFormatId || '');
      setSelectedPrint(meta?.formPrintId || '');

      setMessage(
        `📝 Version ${version} von "${formName}" geladen${isReadonly ? " (gültig – nicht bearbeitbar)" : ""}`
      );
    } catch (err) {
      console.error("❌ Fehler beim Laden:", err);
      setMessage("❌ Fehler beim Laden der Version");
    }
  };

  const handleClear = () => {
    setName('');
    setText('');
    setSelectedVersion(null);
    setIsReadOnly(false);
    setMessage('🧹 Formularfelder geleert – neuer Entwurf kann erstellt werden');
    setSelectedFormat('');
    setSelectedPrint('');
  };

  // Sichtbarkeit öffnen/speichern
  const openVisibilityDialog = (formRow) => {
    setVisEditing(formRow);
    setVisIsGlobal(!!formRow.isGlobal);
    setVisGroupIds(Array.isArray(formRow.groupIds) ? formRow.groupIds : []);
    setVisError('');
    setVisOpen(true);
  };

  const saveVisibility = async () => {
    try {
      if (!visEditing) return;

      // Fallback: _id ggf. aus aktuellem forms-State per name nachschlagen
      const effectiveId = visEditing._id || (forms.find(x => x.name === visEditing.name)?._id);
      if (!effectiveId) {
        setVisError('Kein gültiges Formular-Objekt (._id fehlt). Bitte neu laden.');
        return;
      }

      if (!visIsGlobal && (!Array.isArray(visGroupIds) || visGroupIds.length === 0)) {
        setVisError('Bitte mindestens eine Gruppe auswählen oder „Global“ aktivieren.');
        return;
      }
      await updateFormMeta(effectiveId, { isGlobal: visIsGlobal, groupIds: visGroupIds });
      setVisOpen(false);
      await loadForms();
    } catch (e) {
      console.error(e);
      setVisError(e?.response?.data?.error || e.message);
    }
  };

  useEffect(() => {
    loadForms();
    loadTemplates();
    loadGroups();
  }, []);

  useEffect(() => {
    if (name && selectedVersion === null) {
      setSelectedVersion(1);
    }
  }, [name]);

  return (
    <Container maxWidth="lg">
      {/* 👇 Tenant-bewusster Zurück-Button */}
      <Button
        variant="outlined"
        onClick={() => navigate(`/tenant/${encodeURIComponent(tid)}`)}
        sx={{ mb: 2 }}
      >
        ← Zurück
      </Button>

      <Typography variant="h4" gutterBottom>
        Formular bearbeiten
      </Typography>

      {selectedVersion !== null && (
        <Typography variant="body1" sx={{ mb: 2 }} color="secondary">
          Version {selectedVersion} von "{name}" geladen – Gültig:{' '}
          {forms.find(f => f.name === name)?.validVersion === selectedVersion ? 'Ja' : 'Nein'} – Letztes Update:{' '}
          {(() => {
            const f = forms.find(f => f.name === name);
            return f?.updatedAt ? new Date(f.updatedAt).toLocaleString() : '–';
          })()}
        </Typography>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Button variant="outlined" color="inherit" onClick={handleClear}>
            Leeren
          </Button>
          <Button variant="contained" color="primary" onClick={handleUpload} disabled={isReadOnly}>
            Speichern
          </Button>
          <Button
            variant="outlined"
            color="success"
            onClick={handleRelease}
            disabled={isReadOnly || selectedVersion === null}
          >
            Freigeben
          </Button>
          <Button variant="outlined" color="error" onClick={handleLock} disabled={isReadOnly}>
            Sperren
          </Button>
        </Stack>

        <TextField
          label="Formularname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
          InputProps={{ readOnly: isReadOnly }}
        />

        {isReadOnly && (
          <Typography variant="body2" color="error" sx={{ mb: 2 }}>
            Diese Version ist freigegeben und kann nicht bearbeitet werden.
          </Typography>
        )}

        <TextField
          label="Formulartext (Markdown)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          multiline
          minRows={6}
          fullWidth
          InputProps={{ readOnly: isReadOnly }}
        />

        {!isReadOnly && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" gutterBottom>
              Vorlagen zuweisen (gültige Version erforderlich)
            </Typography>
            <Stack direction="row" spacing={2}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Formatvorlage</InputLabel>
                <Select
                  value={selectedFormat}
                  label="Formatvorlage"
                  onChange={(e) => setSelectedFormat(e.target.value)}
                >
                  <MenuItem value=""><em>Keine</em></MenuItem>
                  {formats.map(f => (
                    <MenuItem key={f._id} value={f._id}>{f.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Druckvorlage</InputLabel>
                <Select
                  value={selectedPrint}
                  label="Druckvorlage"
                  onChange={(e) => setSelectedPrint(e.target.value)}
                >
                  <MenuItem value=""><em>Keine</em></MenuItem>
                  {prints.map(p => (
                    <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button variant="outlined" onClick={handleAssignTemplates}>Zuweisen</Button>
            </Stack>
          </>
        )}
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
            <TableCell>Formatvorlage</TableCell>
            <TableCell>Druckvorlage</TableCell>
            <TableCell>Sichtbarkeit</TableCell>
            <TableCell>Updatedatum</TableCell>
            <TableCell>Aktion</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {forms.map((f, i) => (
            <TableRow
              key={f._id || i}
              selected={f.name === name && (f.validVersion === selectedVersion || f.currentVersion === selectedVersion)}
            >
              <TableCell>{f.name}</TableCell>
              <TableCell>{f.validVersion || '–'}</TableCell>
              <TableCell>{f.currentVersion || '–'}</TableCell>
              <TableCell>{f.validVersion === f.currentVersion ? 'ja' : 'nein'}</TableCell>
              <TableCell>{getFormatName(f.formFormatId)}</TableCell>
              <TableCell>{getPrintName(f.formPrintId)}</TableCell>
              <TableCell>
                {f.isGlobal ? (
                  <Chip size="small" label="global" />
                ) : (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {(f.groupIds || []).map(id => (
                      <Chip key={id} size="small" label={labelForGroup(id)} />
                    ))}
                  </Stack>
                )}
              </TableCell>
              <TableCell>{f.updatedAt ? new Date(f.updatedAt).toLocaleString() : '–'}</TableCell>
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
                  <a
                    href={`/formular-test/${f.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outlined"
                      size="small"
                      color="warning"
                    >
                      Testen
                    </Button>
                  </a>
                  <Tooltip title="Sichtbarkeit ändern">
                    <IconButton size="small" onClick={() => openVisibilityDialog(f)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

      </Table>

      {/* Dialog Sichtbarkeit */}
      <Dialog open={visOpen} onClose={() => setVisOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Formular-Sichtbarkeit</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {visEditing && (
              <Stack>
                <Typography variant="subtitle2" color="text.secondary">
                  Formular: <strong>{visEditing.title || visEditing.name}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary"><code>{visEditing.name}</code></Typography>
              </Stack>
            )}

            <FormControlLabel
              control={<Checkbox checked={visIsGlobal} onChange={e => setVisIsGlobal(e.target.checked)} />}
              label="Global (für alle Gruppen im Tenant sichtbar)"
            />

            <FormControl fullWidth disabled={visIsGlobal}>
              <InputLabel id="groups-label">Gruppen</InputLabel>
              <Select
                labelId="groups-label"
                multiple
                value={visGroupIds}
                onChange={(e) => setVisGroupIds(e.target.value)}
                input={<OutlinedInput label="Gruppen" />}
                renderValue={(selected) => (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {(selected || []).map(id => (
                      <Chip key={id} size="small" label={labelForGroup(id)} />
                    ))}
                  </Stack>
                )}
              >
                {groupOptions.map(go => (
                  <MenuItem key={go.value} value={go.value}>{go.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {visError && <Typography color="error">{visError}</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVisOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={saveVisibility}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminForms;
