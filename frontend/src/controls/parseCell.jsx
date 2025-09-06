// Datei: src/controls/parseCell.jsx
import React from "react";
import renderTextField from "./renderTextField.jsx";
import renderDateField from "./renderDateField.jsx";
import renderCheckbox from "./renderCheckbox.jsx";

export default function parseCell(content, values, onChange, sigRef, isReadOnly) {
  content = (content || "").trim();

  // Checkbox mit Label: [Checkbox name] Optionales Label
  const checkboxMatch = content.match(/^\[Checkbox\s+([^\]]+)]\s*(.*)$/);
  if (checkboxMatch) {
    const name = checkboxMatch[1].trim();
    const label = (checkboxMatch[2] || name).trim();
    return renderCheckbox({
      key: name,
      name,
      label,
      checked: !!values[name],
      onChange,
      disabled: !!isReadOnly,
    });
  }

  // Textfeld: [Textfeld name]
  const textMatch = content.match(/^\[Textfeld\s+([^\]]+)]$/);
  if (textMatch) {
    const name = textMatch[1].trim();
    return renderTextField({
      key: name,
      name,
      label: "",
      value: values[name] || "",
      onChange,
      fullWidth: false,
      size: "small",
      disabled: !!isReadOnly,
    });
  }

  // Datum: [Datum name]
  const dateMatch = content.match(/^\[Datum\s+([^\]]+)]$/);
  if (dateMatch) {
    const name = dateMatch[1].trim();
    return renderDateField({
      key: name,
      name,
      label: "",
      value: values[name] || "",
      onChange,
      fullWidth: false,
      size: "small",
      disabled: !!isReadOnly,
    });
  }

  // Fallback: normaler Text
  return content;
}
