// parseFormText.jsx
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

export function parseFormText(text, values, handleChange, sigRef) {
  const lines = text.split(/\r?\n/);
  const elements = [];

  lines.forEach((line, idx) => {
    // Headings
    if (line.startsWith("# ")) {
      elements.push(
        <Typography key={idx} variant="h5" sx={{ mt: 3 }}>
          {line.slice(2)}
        </Typography>
      );
      return;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <Typography key={idx} variant="h6" sx={{ mt: 2 }}>
          {line.slice(3)}
        </Typography>
      );
      return;
    }

    // Text field
    if (line.includes("[Textfeld ")) {
      const name = line.match(/\[Textfeld (.+?)\]/)?.[1];
      const label = line.replace(/\[Textfeld .+?\]/, "").trim();
      elements.push(
        <TextField
          key={idx}
          label={label}
          value={values[name] || ""}
          onChange={(e) => handleChange(name, e.target.value)}
          fullWidth
          margin="normal"
        />
      );
      return;
    }

    // Date
    if (line.includes("[Datum ")) {
      const name = line.match(/\[Datum (.+?)\]/)?.[1];
      const label = line.replace(/\[Datum .+?\]/, "").trim();
      elements.push(
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
      return;
    }

    // Bullet list checkbox
    if (line.match(/^[-*] +\[Checkbox (.+?)\]/)) {
      const name = line.match(/\[Checkbox (.+?)\]/)?.[1];
      const label = line.replace(/^[-*] +\[Checkbox .+?\] /, "").trim();
      elements.push(
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
      return;
    }

    // Inline checkbox
    if (line.includes("[Checkbox ")) {
      const name = line.match(/\[Checkbox (.+?)\]/)?.[1];
      const textBefore = line.split("[Checkbox ")[0].trim();
      elements.push(
        <Box key={idx} sx={{ display: "flex", alignItems: "center", mt: 1 }}>
          <Typography sx={{ mr: 2 }}>{textBefore}</Typography>
          <Checkbox
            checked={values[name] || false}
            onChange={(e) => handleChange(name, e.target.checked)}
          />
        </Box>
      );
      return;
    }

    // Signature
    if (line.includes("[Signature ")) {
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

    // Default Markdown render
    elements.push(
      <Box key={idx} sx={{ my: 1 }}>
        <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
          {line}
        </ReactMarkdown>
      </Box>
    );
  });

  return elements;
}
