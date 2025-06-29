// src/controls/renderSelect.jsx
import React from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

const renderSelect = ({ key, name, label, value, onChange, options }) => {
  return (
    <FormControl key={key} fullWidth margin="normal">
      <InputLabel>{label}</InputLabel>
      <Select
        value={value || ""}
        label={label}
        onChange={(e) => onChange(name, e.target.value)}
      >
        {options.map((opt, i) => (
          <MenuItem key={i} value={opt}>
            {opt}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default renderSelect;
