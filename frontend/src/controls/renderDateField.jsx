import React from "react";
import { TextField } from "@mui/material";

function callOnChange(fn, name, value) {
  if (typeof fn !== "function") return;
  if (fn.length >= 2) fn(name, value);
  else fn({ target: { name, value } });
}

const renderDateField = ({ key, name, label, value, onChange, disabled = false, fullWidth = true, size = "medium" }) => {
  return (
    <TextField
      key={key}
      label={label}
      type="date"
      InputLabelProps={{ shrink: true }}
      value={value || ""}
      onChange={(e) => callOnChange(onChange, name, e.target.value)}
      disabled={disabled}
      fullWidth={fullWidth}
      margin="normal"
      size={size}
    />
  );
};

export default renderDateField;
