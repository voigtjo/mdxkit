import React, { useState, useEffect } from 'react';
import { uploadForm, getForms } from '@/api/adminApi';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  Alert
} from '@mui/material';

const AdminFormManager = () => {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [forms, setForms] = useState([]);
  const [message, setMessage] = useState('');

  const loadForms = async () => {
    try {
      const list = await getForms();
      setForms(list);
    } catch (err) {
      setMessage('Fehler beim Laden der Formulare');
    }
  };

  const handleUpload = async () => {
    if (!name || !text) return setMessage('Bitte Name und Text eingeben');
    try {
      const result = await uploadForm(name, text);
      setMessage(`✅ Hochgeladen: Version ${result.version}`);
      setName('');
      setText('');
      loadForms();
    } catch (err) {
      setMessage('❌ Fehler beim Hochladen');
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Admin: Formulare verwalten
      </Typography>

      <Box mb={4}>
        <TextField
          label="Formularname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          margin="normal"
        />

        <TextField
          label="Formulartext (Markdown mit Feldern)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          fullWidth
          multiline
          rows={10}
          margin="normal"
        />

        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
        >
          Formular hochladen
        </Button>

        {message && (
          <Box mt={2}>
            <Alert severity={message.startsWith('✅') ? 'success' : 'error'}>
              {message}
            </Alert>
          </Box>
        )}
      </Box>

      <Typography variant="h5" gutterBottom>
        Aktive Formulare
      </Typography>
      <List>
        {forms.map((f) => (
          <ListItem key={f.name} divider>
            <ListItemText
              primary={f.name}
              secondary={`Version ${f.currentVersion}`}
            />
          </ListItem>
        ))}
      </List>
    </Container>
  );
};

export default AdminFormManager;