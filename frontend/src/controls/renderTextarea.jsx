import React from "react";
import { TextField } from "@mui/material";

export default function renderTextarea({ key, name, label, value, onChange }) {
  return (
    <TextField
      key={key}
      label={label}
      value={value}
      onChange={(e) => onChange(name, e.target.value)}
      multiline
      minRows={4}
      fullWidth
      margin="normal"
    />
  );
}
