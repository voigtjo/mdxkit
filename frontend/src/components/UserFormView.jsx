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
  Paper,
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
      } catch {
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
    const lines = text.split(/\r?\n/);
    const elements = [];
    let buffer = [];

    const flushMarkdown = (keyPrefix) => {
      const md = buffer.join("\n").trim();
      if (md) {
        elements.push(
          <Box key={`md-${keyPrefix}`} sx={{ my: 2 }}>
            <ReactMarkdown
              rehypePlugins={[rehypeRaw]}
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({ children }) => (
                  <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", my: 2 }}>
                    {children}
                  </Box>
                ),
                thead: ({ children }) => (
                  <Box component="thead" sx={{ backgroundColor: "#f0f0f0" }}>
                    {children}
                  </Box>
                ),
                tbody: ({ children }) => <Box component="tbody">{children}</Box>,
                tr: ({ children }) => (
                  <Box component="tr" sx={{ borderBottom: "1px solid #ccc" }}>
                    {children}
                  </Box>
                ),
                th: ({ children }) => (
                  <Box
                    component="th"
                    sx={{
                      textAlign: "left",
                      fontWeight: "bold",
                      padding: "8px",
                      border: "1px solid #ccc",
                    }}
                  >
                    {children}
                  </Box>
                ),
                td: ({ children }) => (
                  <Box
                    component="td"
                    sx={{
                      padding: "8px",
                      border: "1px solid #ccc",
                    }}
                  >
                    {children}
                  </Box>
                ),
              }}
            >
              {md}
            </ReactMarkdown>
          </Box>
        );
        buffer = [];
      }
    };

    lines.forEach((line, idx) => {
      if (line.includes("[Textfeld ")) {
        flushMarkdown(idx);
        const name = line.match(/\[Textfeld (.+?)\]/)?.[1];
        elements.push(
          <TextField
            key={`tf-${idx}`}
            label={line.replace(/\[Textfeld .+?\]/, "").trim()}
            value={values[name] || ""}
            onChange={(e) => handleChange(name, e.target.value)}
            fullWidth
            margin="normal"
          />
        );
        return;
      }

      if (line.includes("[Datum ")) {
        flushMarkdown(idx);
        const name = line.match(/\[Datum (.+?)\]/)?.[1];
        elements.push(
          <TextField
            key={`date-${idx}`}
            label={line.replace(/\[Datum .+?\]/, "").trim()}
            type="date"
            InputLabelProps={{ shrink: true }}
            value={values[name] || ""}
            onChange={(e) => handleChange(name, e.target.value)}
            fullWidth
            margin="normal"
          />
        );
        return;
      }

      if (line.match(/^[-*] +\[Checkbox (.+?)\]/)) {
        flushMarkdown(idx);
        const name = line.match(/\[Checkbox (.+?)\]/)?.[1];
        const label = line.replace(/^[-*] +\[Checkbox .+?\]/, "").trim();
        elements.push(
          <FormGroup key={`cb-${idx}`} sx={{ mt: 1 }}>
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
        return;
      }

      if (line.includes("[Checkbox ")) {
        flushMarkdown(idx);
        const name = line.match(/\[Checkbox (.+?)\]/)?.[1];
        const [textBefore] = line.split("[Checkbox ");
        elements.push(
          <Box key={`inline-cb-${idx}`} sx={{ display: "flex", alignItems: "center", mt: 1 }}>
            <Typography sx={{ mr: 2 }}>{textBefore.trim()}</Typography>
            <Checkbox
              checked={values[name] || false}
              onChange={(e) => handleChange(name, e.target.checked)}
            />
          </Box>
        );
        return;
      }

      if (line.includes("[Signature ")) {
        flushMarkdown(idx);
        elements.push(
          <Box key={`sig-${idx}`} sx={{ mt: 3 }}>
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
        return;
      }

      buffer.push(line);
    });

    flushMarkdown("end");

    return elements;
  };

  return (
    <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
      <Paper sx={{ width: "100%", maxWidth: "900px", p: 4 }} elevation={3}>
        {message && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}

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
      </Paper>
    </Box>
  );
};

export default UserFormView;
