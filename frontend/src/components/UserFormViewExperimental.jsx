// src/components/UserFormViewExperimental.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import {
  Box,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Alert,
  Divider,
  Paper,
} from "@mui/material";
import {
  getFormForPatient,
  submitForm,
  getPatient,
  saveFormData,
} from "@/api/userApi";

import { parseFormText } from "@/utils/parseFormText.jsx";

const UserFormViewExperimental = () => {
  const { formName, patientId } = useParams();
  const [formText, setFormText] = useState("");
  const [parsedElements, setParsedElements] = useState([]);
  const [values, setValues] = useState({});
  const [entryId, setEntryId] = useState(null);
  const [message, setMessage] = useState("");
  const [patientName, setPatientName] = useState("");
  const sigRef = useRef();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getFormForPatient(formName, patientId);
        setFormText(res.text);
        setEntryId(res.data._id);
        setValues(res.data.data || {});

        const patient = await getPatient(patientId);
        setPatientName(patient.name);

        const parsed = parseFormText(res.text, res.data.data || {}, handleChange, sigRef);
        console.log("🔍 Parsed elements:", parsed);
        setParsedElements(parsed);
      } catch (err) {
        console.error("❌ Fehler beim Laden des Formulars:", err);
        setMessage("❌ Fehler beim Laden des Formulars");
      }
    };
    load();
  }, [formName, patientId]);

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await saveFormData(entryId, values);
      setMessage("💾 Formular gespeichert");
    } catch {
      setMessage("❌ Fehler beim Speichern");
    }
  };

  const handleSubmit = async () => {
    try {
      const signature = sigRef.current?.getTrimmedCanvas().toDataURL("image/png");
      await submitForm(entryId, values, signature);
      setMessage("✅ Formular abgeschickt");
    } catch {
      setMessage("❌ Fehler beim Abschicken");
    }
  };

  return (
    <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
      <Paper sx={{ width: "100%", maxWidth: "900px", p: 4 }} elevation={3}>
        {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}

        <Typography variant="subtitle1" gutterBottom>
          👤 Patient: <strong>{patientName}</strong>
        </Typography>
        <Divider sx={{ my: 2 }} />

        {/* Direkt JSX-Array rendern */}
        <Box>{parsedElements}</Box>

        <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
          <Button variant="outlined" onClick={handleSave} color="primary">
            💾 Speichern
          </Button>
          <Button variant="contained" onClick={handleSubmit} color="success">
            ✅ Abschicken
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default UserFormViewExperimental;
