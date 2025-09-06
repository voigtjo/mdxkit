// utils/parseForm.jsx
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
import renderTable from "../controls/renderTable.jsx";
import renderColumns from "../controls/renderColumns.jsx";

export function parseForm(text, values = {}, handleChange, sigRef, isReadOnly, formatOptions = null) {
  const lines = text.split(/\r?\n/);
  const elements = [];
  let markdownBuffer = [];

  const headingCounts = { 2: 0, 3: 0, 4: 0 };

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

  const renderHeading = (level, line, idx) => {
    const clean = line.replace(/^#+\s*/, "").trim();
    let numberedLabel = clean;

    if (
      formatOptions?.type === "numberHeadings" &&
      formatOptions.levels.includes(level) &&
      !(level === 1 && formatOptions.excludeFirstLevel1)
    ) {
      if (level === 2) {
        headingCounts[2]++; headingCounts[3] = 0; headingCounts[4] = 0;
        numberedLabel = `${headingCounts[2]}. ${clean}`;
      } else if (level === 3) {
        headingCounts[3]++; headingCounts[4] = 0;
        numberedLabel = `${headingCounts[2]}.${headingCounts[3]}. ${clean}`;
      } else if (level === 4) {
        headingCounts[4]++;
        numberedLabel = `${headingCounts[2]}.${headingCounts[3]}.${headingCounts[4]}. ${clean}`;
      }
    }

    const variants = { 1: "h5", 2: "h6", 3: "subtitle1", 4: "body1" };
    return (
      <Typography key={idx} variant={variants[level]} sx={{ mt: 2, fontWeight: "bold" }}>
        {numberedLabel}
      </Typography>
    );
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // Headings (# … ####)
    if (/^#{1,4}\s+/.test(line)) {
      flushMarkdown(idx);
      const level = line.match(/^#+/)[0].length;
      elements.push(renderHeading(level, line, idx));
      continue;
    }

    // Spalten: [Spalten 1:1 (Inhalt1 | Inhalt2)]
    if (line.startsWith("[Spalten ")) {
      flushMarkdown(idx);
      const match = line.match(/^\[Spalten\s+([0-9:]+)\s*\((.*?)\)]$/);
      if (match) {
        const widths = match[1].split(":").map((r) => parseInt(r.trim(), 10));
        const contents = match[2].split("|");
        if (widths.length === contents.length) {
          elements.push(
            renderColumns({
              key: `columns-${idx}`,
              widths,
              contents,
              values,
              onChange: handleChange,
              sigRef,
              isReadOnly: !!isReadOnly,
            })
          );
          continue;
        }
      }
    }

    // Tabelle: Header + Zeilen sammeln (Header ist die aktuelle Zeile)
    if (line.startsWith("[Tabelle ") && line.endsWith("]")) {
      flushMarkdown(idx);
      const rows = [];
      let j = idx;
      while (j < lines.length && (lines[j].startsWith("[Tabelle") || lines[j].trim().startsWith("-"))) {
        rows.push(lines[j]);
        j++;
      }
      elements.push(
        renderTable({
          key: `table-${idx}`,
          rows,
          values,
          onChange: handleChange,
          sigRef,
          isReadOnly: !!isReadOnly,
        })
      );
      idx = j - 1;
      continue;
    }

    // Select (Block-Variante)
    if (line.includes("[Select ")) {
      flushMarkdown(idx);
      const labelMatch = line.match(/^(.*?):\s*\[Select\s+([^\]]+)]/);
      const label = labelMatch?.[1]?.trim() || `Auswahl-${idx}`;
      const name = labelMatch?.[2]?.trim() || `select-${idx}`;

      const options = [];
      let j = idx + 1;
      while (j < lines.length && lines[j].trim().startsWith("-")) {
        options.push(lines[j].replace(/^-/, "").trim());
        j++;
      }
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

    // Radio (Block-Variante)
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
          onChange: (e) => handleChange({ target: { name, value: e } }),
        })
      );
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

    // Checkbox (inline oder mit Label)
    if (line.includes("[Checkbox ")) {
      flushMarkdown(idx);
      const match = line.match(/\[Checkbox\s+([^\]]+)]/);
      const name = match?.[1]?.trim() || `cb-${idx}`;
      const prefixText = line.split("[Checkbox")[0].trim();
      const suffixLabel = line.split("]").slice(1).join("]").trim();

      if (prefixText && !suffixLabel) {
        elements.push(
          renderInlineCheckbox({
            key: `cb-inline-${idx}`,
            name,
            text: prefixText,
            checked: values[name] || false,
            onChange: (e, val) => handleChange({ target: { name, value: !!val } }),
          })
        );
      } else {
        elements.push(
          renderCheckbox({
            key: `cb-${idx}`,
            name,
            label: suffixLabel || name,
            checked: values[name] || false,
            onChange: (e, val) => handleChange({ target: { name, value: !!val } }),
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
          name,
          value: values[name] || '',
          onChange: (dataUrl) => handleChange({ target: { name, value: dataUrl } }),
          sigRef,
          readOnly: !!isReadOnly,
        })
      );
      continue;
    }

    // Fallback: sammle für Markdown-Absatz
    markdownBuffer.push(line);
  }

  flushMarkdown("end");
  return elements;
}
