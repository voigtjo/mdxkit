// Datei: parseCell.js
import React from "react";
import renderTextField from "./renderTextField.jsx";
import renderDateField from "./renderDateField.jsx";
import renderCheckbox from "./renderCheckbox.jsx";

export default function parseCell(content, values, onChange, sigRef, isReadOnly) {
  content = content.trim();

  // Checkbox mit Label
  const checkboxMatch = content.match(/^\[Checkbox\s+([^\]]+)]\s*(.*)$/);
  if (checkboxMatch) {
    const name = checkboxMatch[1];
    const label = checkboxMatch[2] || name;
    return renderCheckbox({
      key: name,
      name,
      label,
      checked: values[name] || false,
      onChange,
      disabled: isReadOnly,
    });
  }

  // Textfeld
  const textMatch = content.match(/^\[Textfeld\s+([^\]]+)]$/);
  if (textMatch) {
    const name = textMatch[1];
    return renderTextField({
      key: name,
      name,
      label: "",
      value: values[name] || "",
      onChange,
      fullWidth: false,
      size: "small",
      disabled: isReadOnly,
    });
  }

  // Datum
  const dateMatch = content.match(/^\[Datum\s+([^\]]+)]$/);
  if (dateMatch) {
    const name = dateMatch[1];
    return renderDateField({
      key: name,
      name,
      label: "",
      value: values[name] || "",
      onChange,
      fullWidth: false,
      size: "small",
      disabled: isReadOnly,
    });
  }

  // Fallback: normaler Text
  return content;
}
