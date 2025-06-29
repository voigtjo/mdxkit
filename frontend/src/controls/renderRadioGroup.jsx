import React from "react";
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";

export default function renderRadioGroup({ key, name, label, options, value, onChange }) {
  return (
    <FormControl key={key} component="fieldset" margin="normal" fullWidth>
      <FormLabel component="legend">{label}</FormLabel>
      <RadioGroup
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        name={name}
      >
        {options.map((opt, idx) => (
          <FormControlLabel
            key={`${key}-${idx}`}
            value={opt}
            control={<Radio />}
            label={opt}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}
