// ✅ UserForm mit formatText-Auswertung & finalem Read-Only bei 'angenommen'
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  getFormForTest,
  submitForm,
  submitFormTest,
  getPatient,
  saveFormData,
  saveFormDataTest,
} from "@/api/formApi";

import { parseForm } from "@/utils/parseForm.jsx";
import { parseFormatOptions } from "@/utils/parseFormatOptions.js"; // NEU
import usePerms, { PERMS as P } from '@/hooks/usePerms';

const UserForm = () => {
  const { can } = usePerms();
  const canEditPerm = can(P.FORMDATA_EDIT);

  const { formName, patientId } = useParams();
  // TEST: keine patientId im Pfad; PROD: patientId vorhanden
  const MODE = patientId ? "PROD" : "TEST";

  const [formText, setFormText] = useState("");
  const [formatText, setFormatText] = useState("");
  const [values, setValues] = useState({});
  const [entryId, setEntryId] = useState(null);
  const [message, setMessage] = useState("");
  const [patientName, setPatientName] = useState("");
  const [status, setStatus] = useState("neu");
  const [updatedAt, setUpdatedAt] = useState(null);

  const sigRef = useRef();
  const printRef = useRef();
  const signatureLoaded = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res =
          MODE === "TEST"
            ? await getFormForTest(formName)
            : await getFormForPatient(formName, patientId);

        setFormText(res.text);
        setFormatText(res.format || "");
        setEntryId(res.data._id);
        setValues(res.data.data || {});
        setStatus(res.data.status || "neu");
        setUpdatedAt(res.data.updatedAt ? new Date(res.data.updatedAt) : null);

        if (res.data.signature && sigRef.current) {
          sigRef.current.fromDataURL(res.data.signature);
          signatureLoaded.current = true;
        }

        if (MODE === "PROD") {
          const patient = await getPatient(patientId);
          setPatientName(patient.name);
        } else {
          setPatientName("Max Mustermann");
        }
      } catch (err) {
        console.error("❌ Fehler beim Laden des Formulars:", err);
        setMessage(err?.response?.data?.error || "❌ Fehler beim Laden des Formulars");
      }
    };
    load();
  }, [formName, patientId, MODE]);

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  // In PROD editierbar nur bei 'offen' oder 'gespeichert'. In TEST immer editierbar.
  const isEditableByStatus = MODE === "TEST" ? true : (status === "offen" || status === "gespeichert");
  const isEditable = canEditPerm && isEditableByStatus;
  const formatOptions = parseFormatOptions(formatText);

  const handleSave = async () => {
    if (!isEditable) {
      setMessage("⛔ Dieses Formular ist nicht mehr bearbeitbar.");
      return;
    }
    try {
      const hasSignature = sigRef.current && !sigRef.current.isEmpty();
      const signature = hasSignature ? sigRef.current.toDataURL("image/png") : null;

      const saveFn = MODE === "TEST" ? saveFormDataTest : saveFormData;
      const updated = await saveFn(entryId, values, signature);

      setMessage("💾 Formular gespeichert");
      setStatus(updated?.status || "gespeichert");
      setUpdatedAt(new Date());
    } catch (err) {
      console.error("❌ Fehler beim Speichern:", err);
      setMessage(err?.response?.data?.error || "❌ Fehler beim Speichern");
    }
  };

  const handleSubmit = async () => {
    if (!isEditable) {
      setMessage("⛔ Dieses Formular ist nicht mehr freigebbar.");
      return;
    }
    try {
      const isSigEmpty =
        !sigRef.current || (!signatureLoaded.current && sigRef.current.isEmpty());
      if (isSigEmpty) {
        setMessage("✍️ Bitte unterschreiben Sie das Formular");
        return;
      }

      const signature = sigRef.current.toDataURL("image/png");
      const submitFn = MODE === "TEST" ? submitFormTest : submitForm;
      await submitFn(entryId, values, signature);

      setMessage("✅ Formular freigegeben");
      setStatus("freigegeben");
      setUpdatedAt(new Date());
    } catch (err) {
      console.error("❌ Fehler bei der Freigabe:", err);
      setMessage(err?.response?.data?.error || "❌ Fehler bei der Freigabe");
    }
  };

  const handleDownloadPDF = async () => {
    const input = printRef.current;
    if (!input) return;

    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const margin = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const usableWidth = pageWidth - 2 * margin;

    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = usableWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
    pdf.save(`${formName}-${patientName}.pdf`);
  };

  const handlePrint = async () => {
    const input = printRef.current;
    if (!input) return;

    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth() - 40;
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 20, 20, pdfWidth, pdfHeight);
    const pdfBlob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(blobUrl);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } else {
      console.error("❌ Konnte Druckfenster nicht öffnen");
    }
  };

  // PDF/Druck: erlauben bei Test-Mode ODER wenn freigegeben ODER wenn Bearbeitungsrecht
  const canOutput = MODE === 'TEST' || status === 'freigegeben' || canEditPerm;

  return (
    <Box sx={{ p: 4, display: "flex", justifyContent: "center", overflowX: "auto" }}>
      <Paper sx={{ width: "100%", maxWidth: "1400px", minWidth: "1000px", p: 4 }} elevation={3}>
        {MODE === "TEST" && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            ⚠️ Dies ist eine <strong>Testnutzung</strong> des Formulars!
          </Alert>
        )}

        {message && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="subtitle1">
              👤 Patient: <strong>{patientName}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Status: {status} {updatedAt && `(${updatedAt.toLocaleString()})`}
              {MODE === "PROD" && !isEditable && status === "freigegeben" && " – Ansicht schreibgeschützt"}
              {MODE === "PROD" && !isEditable && status === "angenommen" && " – abgeschlossen (read-only)"}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={handleSave} color="primary" disabled={!isEditable}>
              💾 Speichern
            </Button>
            <Button variant="contained" onClick={handleSubmit} color="success" disabled={!isEditable}>
              ✅ Freigeben
            </Button>
            <Button variant="outlined" onClick={handleDownloadPDF} color="secondary" disabled={!canOutput}>
              📄 PDF
            </Button>
            <Button variant="outlined" onClick={handlePrint} color="secondary" disabled={!canOutput}>
              🖨️ Drucken
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Box ref={printRef}>
          {parseForm(formText, values, handleChange, sigRef, !isEditable, formatOptions)}
        </Box>
      </Paper>
    </Box>
  );
};

export default UserForm;
