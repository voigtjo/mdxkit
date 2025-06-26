// parseFormText.jsx (mit Markdown-Block-Support für Tabellen und HTML)
import React from "react";
import {
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Box,
  FormGroup,
} from "@mui/material";
import SignatureCanvas from "react-signature-canvas";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

export function parseFormText(text, values = {}, handleChange, sigRef) {
  console.log("Formulartext:\n", text);
  const lines = text.split(/\r?\n/);
  console.log("Formularzeilen:", lines);

  const elements = [];
  const safeValue = (name, fallback = "") => values?.[name] ?? fallback;
  const safeChecked = (name) => !!values?.[name];

  let markdownBuffer = [];

  const flushMarkdown = (idx) => {
    if (markdownBuffer.length > 0) {
      const markdownText = markdownBuffer.join("\n");
      elements.push(
        <Box key={`md-${idx}`} sx={{ my: 2 }}>
          <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
            {markdownText}
          </ReactMarkdown>
        </Box>
      );
      markdownBuffer = [];
    }
  };

  lines.forEach((line, idx) => {
    console.log(`Zeile ${idx}:`, line);

    // Headings
    if (line.startsWith("# ")) {
      flushMarkdown(idx);
      elements.push(
        <Typography key={idx} variant="h5" sx={{ mt: 3 }}>
          {line.slice(2)}
        </Typography>
      );
      return;
    }

    if (line.startsWith("## ")) {
      flushMarkdown(idx);
      elements.push(
        <Typography key={idx} variant="h6" sx={{ mt: 2 }}>
          {line.slice(3)}
        </Typography>
      );
      return;
    }

    // Text field
    if (line.includes("[Textfeld ")) {
      flushMarkdown(idx);
      const name = line.match(/\[Textfeld (.+?)\]/)?.[1];
      const label = line.replace(/\[Textfeld .+?\]/, "").trim();
      console.log("Textfeld erkannt:", name, label);
      elements.push(
        <TextField
          key={idx}
          label={label}
          value={safeValue(name)}
          onChange={(e) => handleChange(name, e.target.value)}
          fullWidth
          margin="normal"
        />
      );
      return;
    }

    // Date
    if (line.includes("[Datum ")) {
      flushMarkdown(idx);
      const name = line.match(/\[Datum (.+?)\]/)?.[1];
      const label = line.replace(/\[Datum .+?\]/, "").trim();
      console.log("Datum erkannt:", name, label);
      elements.push(
        <TextField
          key={idx}
          label={label}
          type="date"
          InputLabelProps={{ shrink: true }}
          value={safeValue(name)}
          onChange={(e) => handleChange(name, e.target.value)}
          fullWidth
          margin="normal"
        />
      );
      return;
    }

    // Bullet list checkbox
    if (line.match(/^[-*] +\[Checkbox (.+?)\]/)) {
      flushMarkdown(idx);
      const name = line.match(/\[Checkbox (.+?)\]/)?.[1];
      const label = line.replace(/^[-*] +\[Checkbox .+?\] /, "").trim();
      console.log("Bullet-Checkbox erkannt:", name, label);
      elements.push(
        <FormGroup key={idx} sx={{ mt: 1 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={safeChecked(name)}
                onChange={(e) => handleChange(name, e.target.checked)}
              />
            }
            label={label}
          />
        </FormGroup>
      );
      return;
    }

    // Inline checkbox
    if (line.includes("[Checkbox ")) {
      flushMarkdown(idx);
      const name = line.match(/\[Checkbox (.+?)\]/)?.[1];
      const textBefore = line.split("[Checkbox ")[0].trim();
      console.log("Inline-Checkbox erkannt:", name, textBefore);
      elements.push(
        <Box key={idx} sx={{ display: "flex", alignItems: "center", mt: 1 }}>
          <Typography sx={{ mr: 2 }}>{textBefore}</Typography>
          <Checkbox
            checked={safeChecked(name)}
            onChange={(e) => handleChange(name, e.target.checked)}
          />
        </Box>
      );
      return;
    }

    // Signature
    if (line.includes("[Signature ")) {
      flushMarkdown(idx);
      console.log("Signatur erkannt");
      elements.push(
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
      return;
    }

    // Standard-Markdown-Zeile puffern
    markdownBuffer.push(line);
  });

  // Letzten Markdown-Block flushen
  flushMarkdown("end");

  return elements;
}
