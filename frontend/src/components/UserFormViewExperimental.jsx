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

        const parsed = parseFormText(res.text);
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

  const renderElement = (el, idx) => {
    switch (el.type) {
      case "heading":
        return (
          <Typography key={idx} variant={el.level === 1 ? "h5" : "h6"} sx={{ mt: 2 }}>
            {el.content}
          </Typography>
        );
      case "text":
        return (
          <Typography key={idx} sx={{ my: 1 }}>
            {el.content}
          </Typography>
        );
      case "textfield":
        return (
          <TextField
            key={idx}
            label={el.label}
            value={values[el.name] || ""}
            onChange={(e) => handleChange(el.name, e.target.value)}
            fullWidth
            margin="normal"
          />
        );
      case "date":
        return (
          <TextField
            key={idx}
            label={el.label}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={values[el.name] || ""}
            onChange={(e) => handleChange(el.name, e.target.value)}
            fullWidth
            margin="normal"
          />
        );
      case "checkbox":
        return (
          <FormControlLabel
            key={idx}
            control={
              <Checkbox
                checked={values[el.name] || false}
                onChange={(e) => handleChange(el.name, e.target.checked)}
              />
            }
            label={el.label}
          />
        );
      case "signature":
        return (
          <Box key={idx} sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Unterschrift:
            </Typography>
            <SignatureCanvas
              ref={sigRef}
              penColor="black"
              canvasProps={{ className: "border", style: { width: "100%", height: 100 } }}
            />
          </Box>
        );
      default:
        return null;
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

        {parsedElements.map((el, idx) => renderElement(el, idx))}

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
