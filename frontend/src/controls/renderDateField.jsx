import React from "react";
import { TextField } from "@mui/material";

const renderDateField = ({ key, name, label, value, onChange }) => {
  return (
    <TextField
      key={key}
      label={label}
      type="date"
      InputLabelProps={{ shrink: true }}
      value={value || ""}
      onChange={(e) => onChange(name, e.target.value)}
      fullWidth
      margin="normal"
    />
  );
};

export default renderDateField;
