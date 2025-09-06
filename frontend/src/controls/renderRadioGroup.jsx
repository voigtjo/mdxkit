import React from "react";
import { FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from "@mui/material";

function callOnChange(fn, name, value) {
  if (typeof fn !== "function") return;
  if (fn.length >= 2) fn(name, value);
  else fn({ target: { name, value } });
}

export default function renderRadioGroup({ key, name, label, options = [], value, onChange, disabled = false, row = false }) {
  return (
    <FormControl key={key} component="fieldset" margin="normal" fullWidth disabled={disabled}>
      {label ? <FormLabel component="legend">{label}</FormLabel> : null}
      <RadioGroup
        row={row}
        value={value ?? ""}
        name={name}
        onChange={(e) => callOnChange(onChange, name, e.target.value)}
      >
        {options.map((opt, idx) => (
          <FormControlLabel
            key={`${key}-${idx}`}
            value={opt}
            control={<Radio disabled={disabled} />}
            label={opt}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}
