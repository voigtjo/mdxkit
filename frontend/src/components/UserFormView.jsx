import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import {
  Box,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  Alert,
  Divider,
  FormGroup,
} from "@mui/material";

import {
  getFormForPatient,
  submitForm,
  getPatient,
  saveFormData,
} from "@/api/userApi";

const UserFormView = () => {
  const { formName, patientId } = useParams();
  const [text, setText] = useState("");
  const [values, setValues] = useState({});
  const [entryId, setEntryId] = useState(null);
  const [message, setMessage] = useState("");
  const [patientName, setPatientName] = useState("");
  const sigRef = useRef();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getFormForPatient(formName, patientId);
        setText(res.text);
        setEntryId(res.data._id);
        setValues(res.data.data || {});

        const patient = await getPatient(patientId);
        setPatientName(patient.name);
      } catch (err) {
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
      const signature = sigRef.current.getTrimmedCanvas().toDataURL("image/png");
      await submitForm(entryId, values, signature);
      setMessage("✅ Formular abgeschickt");
    } catch {
      setMessage("❌ Fehler beim Abschicken");
    }
  };

  const renderForm = () => {
    return text.split(/\r?\n/).map((line, idx) => {
      if (line.includes("[Textfeld ")) {
        const name = line.match(/\[Textfeld (.+?)\]/)?.[1];
        const label = line.replace(/\[Textfeld .+?\]/, "").trim();
        return (
          <TextField
            key={idx}
            label={label}
            value={values[name] || ""}
            onChange={(e) => handleChange(name, e.target.value)}
            fullWidth
            margin="normal"
          />
        );
      }

      if (line.includes("[Datum ")) {
        const name = line.match(/\[Datum (.+?)\]/)?.[1];
        const label = line.replace(/\[Datum .+?\]/, "").trim();
        return (
          <TextField
            key={idx}
            label={label}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={values[name] || ""}
            onChange={(e) => handleChange(name, e.target.value)}
            fullWidth
            margin="normal"
          />
        );
      }

      if (line.includes("[Checkbox ")) {
        const name = line.match(/\[Checkbox (.+?)\]/)?.[1];
        const label = line.replace(/.*\] /, "").trim();
        return (
          <FormGroup key={idx} sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={values[name] || false}
                  onChange={(e) => handleChange(name, e.target.checked)}
                />
              }
              label={label}
            />
          </FormGroup>
        );
      }

      if (line.includes("[Signature ")) {
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
      }

      return (
        <Box key={idx} sx={{ my: 1 }}>
          <ReactMarkdown rehypePlugins={[rehypeRaw, remarkGfm]}>{line}</ReactMarkdown>
        </Box>
      );
    });
  };

  return (
    <Box sx={{ p: 4, maxWidth: 700, mx: "auto" }}>
      {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}

      <Typography variant="subtitle1" gutterBottom>
        👤 Patient: <strong>{patientName}</strong>
      </Typography>
      <Divider sx={{ my: 2 }} />

      {renderForm()}

      <Box sx={{ display: "flex", gap: 2, mt: 4 }}>
        <Button variant="outlined" onClick={handleSave} color="primary">
          💾 Speichern
        </Button>
        <Button variant="contained" onClick={handleSubmit} color="success">
          ✅ Abschicken
        </Button>
      </Box>
    </Box>
  );
};

export default UserFormView;
