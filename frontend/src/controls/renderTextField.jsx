// src/controls/renderTextField.jsx
import React from "react";
import { TextField } from "@mui/material";

export default function renderTextField({ key, name, label, value, onChange }) {
  return (
    <TextField
      key={key}
      label={label}
      value={value}
      onChange={(e) => onChange(name, e.target.value)}
      fullWidth
      margin="normal"
    />
  );
}
