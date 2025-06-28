import React from "react";
import {
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Box,
  FormGroup,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from "@mui/material";
import SignatureCanvas from "react-signature-canvas";

export function parseFormStructured(text, values, handleChange, sigRef) {
  const elements = [];
  const safeValue = (name, fallback = "") => values?.[name] ?? fallback;
  const safeChecked = (name) => !!values?.[name];

  const lines = text.split(/\r?\n/);
  let tableBuffer = null;

  lines.forEach((line, idx) => {
    const flushTable = () => {
      if (tableBuffer) {
        const rows = tableBuffer.map(row => row.split("|").map(cell => cell.trim()));
        const hasHeader = rows[0]?.some(cell => cell !== "");
        const header = hasHeader ? rows[0] : null;
        const bodyRows = hasHeader ? rows.slice(1) : rows;
        elements.push(
          <Table key={`tbl-${idx}`} sx={{ my: 2 }}>
            {header && (
              <TableHead>
                <TableRow>
                  {header.map((cell, i) => <TableCell key={`th-${i}`}><strong>{cell}</strong></TableCell>)}
                </TableRow>
              </TableHead>
            )}
            <TableBody>
              {bodyRows.map((row, i) => (
                <TableRow key={`tr-${i}`}>
                  {row.map((cell, j) => <TableCell key={`td-${i}-${j}`}>{cell}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );
        tableBuffer = null;
      }
    };

    if (line === "[Tabelle]") {
      tableBuffer = [];
      return;
    }
    if (line === "[/Tabelle]") {
      flushTable();
      return;
    }
    if (tableBuffer) {
      tableBuffer.push(line);
      return;
    }

    if (line.startsWith("# ")) {
      elements.push(<Typography key={idx} variant="h5" sx={{ mt: 3 }}>{line.slice(2)}</Typography>);
      return;
    }
    if (line.startsWith("## ")) {
      elements.push(<Typography key={idx} variant="h6" sx={{ mt: 2 }}>{line.slice(3)}</Typography>);
      return;
    }
    if (line.includes("[Textfeld ")) {
      const name = line.match(/\[Textfeld (.+?)\]/)?.[1];
      const label = line.replace(/\[Textfeld .+?\]/, "").trim();
      elements.push(<TextField key={idx} label={label} value={safeValue(name)} onChange={(e) => handleChange(name, e.target.value)} fullWidth margin="normal" />);
      return;
    }
    if (line.includes("[Datum ")) {
      const name = line.match(/\[Datum (.+?)\]/)?.[1];
      const label = line.replace(/\[Datum .+?\]/, "").trim();
      elements.push(<TextField key={idx} label={label} type="date" InputLabelProps={{ shrink: true }} value={safeValue(name)} onChange={(e) => handleChange(name, e.target.value)} fullWidth margin="normal" />);
      return;
    }
    if (line.match(/^[-*] +\[Checkbox (.+?)\]/)) {
      const name = line.match(/\[Checkbox (.+?)\]/)?.[1];
      const label = line.replace(/^[-*] +\[Checkbox .+?\]/, "").trim();
      elements.push(
        <FormGroup key={idx} sx={{ mt: 1 }}>
          <FormControlLabel
            control={<Checkbox checked={safeChecked(name)} onChange={(e) => handleChange(name, e.target.checked)} />}
            label={label}
          />
        </FormGroup>
      );
      return;
    }
    if (line.includes("[Checkbox ")) {
      const name = line.match(/\[Checkbox (.+?)\]/)?.[1];
      const textBefore = line.split("[Checkbox ")[0].trim();
      elements.push(
        <Box key={idx} sx={{ display: "flex", alignItems: "center", mt: 1 }}>
          <Typography sx={{ mr: 2 }}>{textBefore}</Typography>
          <Checkbox checked={safeChecked(name)} onChange={(e) => handleChange(name, e.target.checked)} />
        </Box>
      );
      return;
    }
    if (line.includes("[Signature ")) {
      elements.push(
        <Box key={idx} sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Unterschrift:</Typography>
          <SignatureCanvas ref={sigRef} penColor="black" canvasProps={{ className: "border", style: { width: "100%", height: 100 } }} />
        </Box>
      );
      return;
    }
    if (line.trim() !== "") {
      elements.push(<Typography key={idx} sx={{ my: 1 }}>{line}</Typography>);
    }
  });

  return elements;
}
