import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";

import {
  Box,
  Typography,
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

import { parseForm } from "@/utils/parseForm.jsx";

const UserForm = () => {
  const { formName, patientId } = useParams();
  const [formText, setFormText] = useState("");
  const [values, setValues] = useState({});
  const [entryId, setEntryId] = useState(null);
  const [message, setMessage] = useState("");
  const [patientName, setPatientName] = useState("");
  const [status, setStatus] = useState("neu");
  const [updatedAt, setUpdatedAt] = useState(null);
  const sigRef = useRef();
  const signatureLoaded = useRef(false); // NEU

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getFormForPatient(formName, patientId);
        setFormText(res.text);
        setEntryId(res.data._id);
        setValues(res.data.data || {});
        setStatus(res.data.status || "neu");
        setUpdatedAt(res.data.updatedAt ? new Date(res.data.updatedAt) : null);

        // Signatur laden
        if (res.data.signature && sigRef.current) {
          sigRef.current.fromDataURL(res.data.signature);
          signatureLoaded.current = true;
          console.log("✍️ Signatur gesetzt aus DB");
        }

        const patient = await getPatient(patientId);
        setPatientName(patient.name);
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
      const hasSignature = sigRef.current && !sigRef.current.isEmpty();
      const signature = hasSignature
        ? sigRef.current.toDataURL("image/png")
        : null;

      console.log("💾 [handleSave] ID:", entryId);
      console.log("🖋️ Signatur vorhanden:", hasSignature);
      if (hasSignature) {
        console.log("🖋️ Signature (Ausschnitt):", signature.substring(0, 50));
      }

      await saveFormData(entryId, values, signature);
      setMessage("💾 Formular gespeichert");
      setStatus("gespeichert");
      setUpdatedAt(new Date());
    } catch (err) {
      console.error("❌ Fehler beim Speichern:", err);
      setMessage("❌ Fehler beim Speichern");
    }
  };

  const handleSubmit = async () => {
  try {
    const isSigEmpty =
      !sigRef.current ||
      (!signatureLoaded.current && sigRef.current.isEmpty());

    if (isSigEmpty) {
      setMessage("✍️ Bitte unterschreiben Sie das Formular");
      return;
    }

    let signature;
    try {
      signature = sigRef.current.toDataURL("image/png"); // ← HIER STATT getTrimmedCanvas()
      console.log("✅ [handleSubmit] Signatur gesetzt:", signature.substring(0, 50));
    } catch (err) {
      console.error("❌ Fehler beim Verarbeiten der Signatur:", err);
      setMessage("❌ Fehler beim Verarbeiten der Signatur");
      return;
    }

    await submitForm(entryId, values, signature);
    setMessage("✅ Formular freigegeben");
    setStatus("freigegeben");
    setUpdatedAt(new Date());
  } catch (err) {
    console.error("❌ Fehler bei der Freigabe:", err);
    setMessage("❌ Fehler bei der Freigabe");
  }
};


  const isEditable = status !== "freigegeben";

  return (
    <Box sx={{ p: 4, display: "flex", justifyContent: "center", overflowX: "auto" }}>
      <Paper sx={{ width: "100%", maxWidth: "1400px", minWidth: "1000px", p: 4 }} elevation={3}>
        {message && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}

        {/* Header mit Patient, Status und Buttons */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="subtitle1">
              👤 Patient: <strong>{patientName}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Status: {status} {updatedAt && `(${updatedAt.toLocaleString()})`}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={handleSave} color="primary" disabled={!isEditable}>
              💾 Speichern
            </Button>
            <Button variant="contained" onClick={handleSubmit} color="success" disabled={!isEditable}>
              ✅ Freigeben
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box>{parseForm(formText, values, handleChange, sigRef, !isEditable)}</Box>
      </Paper>
    </Box>
  );
};

export default UserForm;
