import React from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

function callOnChange(fn, name, value) {
  if (typeof fn !== "function") return;
  if (fn.length >= 2) fn(name, value);
  else fn({ target: { name, value } });
}

const renderSelect = ({ key, name, label, value, onChange, options = [], disabled = false }) => {
  const selectId = `select-${name}`;

  return (
    <FormControl key={key} fullWidth margin="normal" disabled={disabled}>
      {label ? <InputLabel id={`${selectId}-label`}>{label}</InputLabel> : null}
      <Select
        labelId={`${selectId}-label`}
        id={selectId}
        value={value || ""}
        label={label || undefined}
        onChange={(e) => callOnChange(onChange, name, e.target.value)}
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
