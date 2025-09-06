import React from "react";
import { TextField } from "@mui/material";

function callOnChange(fn, name, value) {
  if (typeof fn !== "function") return;
  if (fn.length >= 2) fn(name, value);
  else fn({ target: { name, value } });
}

export default function renderTextarea({ key, name, label, value, onChange, disabled = false }) {
  return (
    <TextField
      key={key}
      label={label}
      value={value || ""}
      onChange={(e) => callOnChange(onChange, name, e.target.value)}
      disabled={disabled}
      multiline
      minRows={4}
      fullWidth
      margin="normal"
    />
  );
}
