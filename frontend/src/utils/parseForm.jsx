import React from "react";
import { Box, Typography } from "@mui/material";
import renderTextField from "../controls/renderTextField.jsx";
import renderDateField from "../controls/renderDateField.jsx";
import renderCheckbox from "../controls/renderCheckbox.jsx";
import renderInlineCheckbox from "../controls/renderInlineCheckbox.jsx";
import renderSignature from "../controls/renderSignature.jsx";
import renderSelect from "../controls/renderSelect.jsx";
import renderTextarea from "../controls/renderTextarea.jsx";
import renderRadioGroup from "../controls/renderRadioGroup.jsx";



export function parseForm(text, values = {}, handleChange, sigRef) {
  const lines = text.split(/\r?\n/);
  const elements = [];
  let markdownBuffer = [];
  let inTable = false;
  let tableRows = [];

  const flushMarkdown = (idx) => {
    if (markdownBuffer.length > 0) {
      const block = markdownBuffer.join("\n").trim();
      if (block) {
        elements.push(
          <Box key={`md-${idx}`} sx={{ my: 2 }}>
            <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
              {block}
            </Typography>
          </Box>
        );
      }
      markdownBuffer = [];
    }
  };

  const flushTable = (idx) => {
    if (tableRows.length > 0) {
      elements.push(
        <Box
          key={`table-${idx}`}
          component="table"
          sx={{ width: "100%", borderCollapse: "collapse", my: 2 }}
        >
          <tbody>
            {tableRows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row
                  .split("|")
                  .slice(1, -1)
                  .map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      style={{ border: "1px solid #ccc", padding: 8 }}
                    >
                      {cell.trim()}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </Box>
      );
      tableRows = [];
    }
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    if (line.startsWith("[Tabelle]")) {
      flushMarkdown(idx);
      inTable = true;
      continue;
    }
    if (line.startsWith("[/Tabelle]")) {
      inTable = false;
      flushTable(idx);
      continue;
    }
    if (inTable) {
      tableRows.push(line);
      continue;
    }

    // Headings
    if (line.startsWith("# ")) {
      flushMarkdown(idx);
      elements.push(
        <Typography key={idx} variant="h5" sx={{ mt: 3 }}>
          {line.slice(2)}
        </Typography>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushMarkdown(idx);
      elements.push(
        <Typography key={idx} variant="h6" sx={{ mt: 2 }}>
          {line.slice(3)}
        </Typography>
      );
      continue;
    }
    if (line.startsWith("### ")) {
      flushMarkdown(idx);
      elements.push(
        <Typography
          key={idx}
          variant="subtitle1"
          sx={{ mt: 2, fontWeight: "bold", fontSize: "1.1rem" }}
        >
          {line.slice(4)}
        </Typography>
      );
      continue;
    }

    // Select-Feld
    if (line.includes("[Select ")) {
      flushMarkdown(idx);
      const labelMatch = line.match(/^(.*?):\s*\[Select\s+([^\]]+)]/);
      const label = labelMatch?.[1]?.trim() || `Auswahl-${idx}`;
      const name = labelMatch?.[2]?.trim() || `select-${idx}`;

      // Optionen sammeln
      const options = [];
      let j = idx + 1;
      while (j < lines.length && lines[j].trim().startsWith("-")) {
        options.push(lines[j].replace(/^-/, "").trim());
        j++;
      }

      // idx um die Anzahl übersprungener Zeilen erhöhen
      idx = j - 1;

      elements.push(
        renderSelect({
          key: `select-${idx}`,
          name,
          label,
          value: values[name] || "",
          onChange: handleChange,
          options,
        })
      );
      continue;
    }

    // RadioGroup
    if (line.includes("[Radio ")) {
      flushMarkdown(idx);

      const match = line.match(/^(.*?):\s*\[Radio\s+([^\]]+)]/);
      const label = match?.[1]?.trim() || `Radio-${idx}`;
      const name = match?.[2]?.trim() || `radio-${idx}`;

      const options = [];
      let i = idx + 1;
      while (i < lines.length && lines[i].trim().startsWith("-")) {
        options.push(lines[i].replace(/^-/, "").trim());
        i++;
      }

      elements.push(
        renderRadioGroup({
          key: `radio-${idx}`,
          name,
          label,
          options,
          value: values[name] || "",
          onChange: handleChange,
        })
      );

      // Zeigerposition anpassen, um genutzte Optionszeilen zu überspringen
      idx = i - 1;
      continue;
    }


    // Textfeld
    if (line.includes("[Textfeld ")) {
      flushMarkdown(idx);
      const match = line.match(/^(.*?):\s*\[Textfeld\s+([^\]]+)]/);
      const label = match?.[1]?.trim() || `Textfeld-${idx}`;
      const name = match?.[2]?.trim() || `text-${idx}`;
      elements.push(
        renderTextField({
          key: `text-${idx}`,
          name,
          label,
          value: values[name] || "",
          onChange: handleChange,
        })
      );
      continue;
    }

    // Datum
    if (line.includes("[Datum ")) {
      flushMarkdown(idx);
      const match = line.match(/^(.*?):\s*\[Datum\s+([^\]]+)]/);
      const label = match?.[1]?.trim() || `Datum-${idx}`;
      const name = match?.[2]?.trim() || `date-${idx}`;
      elements.push(
        renderDateField({
          key: `date-${idx}`,
          name,
          label,
          value: values[name] || "",
          onChange: handleChange,
        })
      );
      continue;
    }

        // Textarea
    if (line.includes("[Textarea ")) {
      flushMarkdown(idx);
      const match = line.match(/^(.*?):\s*\[Textarea\s+([^\]]+)]/);
      const label = match?.[1]?.trim() || `Textbereich-${idx}`;
      const name = match?.[2]?.trim() || `textarea-${idx}`;
      elements.push(
        renderTextarea({
          key: `textarea-${idx}`,
          name,
          label,
          value: values[name] || "",
          onChange: handleChange,
        })
      );
      continue;
    }


    // Checkbox
    if (line.includes("[Checkbox ")) {
      flushMarkdown(idx);
      const match = line.match(/\[Checkbox\s+([^\]]+)]/);
      const name = match?.[1]?.trim() || `cb-${idx}`;
      const prefixText = line.split("[Checkbox")[0].trim();
      const suffixLabel = line.split("]").slice(1).join("]").trim();

      if (prefixText && !suffixLabel) {
        // Inline-Checkbox
        elements.push(
          renderInlineCheckbox({
            key: `cb-inline-${idx}`,
            name,
            text: prefixText,
            checked: values[name] || false,
            onChange: handleChange,
          })
        );
      } else {
        // Normale Checkbox
        elements.push(
          renderCheckbox({
            key: `cb-${idx}`,
            name,
            label: suffixLabel || name,
            checked: values[name] || false,
            onChange: handleChange,
          })
        );
      }
      continue;
    }

    // Signature
    if (line.includes("[Signature ")) {
      flushMarkdown(idx);
      const match = line.match(/\[Signature\s+([^\]]+)]/);
      const name = match?.[1]?.trim() || `signature-${idx}`;
      elements.push(
        renderSignature({
          key: `sig-${idx}`,
          sigRef,
        })
      );
      continue;
    }

    // normaler Textpuffer
    markdownBuffer.push(line);
  }

  flushMarkdown("end");
  return elements;
}
