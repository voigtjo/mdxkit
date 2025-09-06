import React from "react";
import { Checkbox, FormControlLabel, FormGroup, Box, Typography } from "@mui/material";

function callOnChange(fn, name, value) {
  if (typeof fn !== "function") return;
  // Unterstützt beide Formen: (name, value) ODER ({target:{name,value}})
  if (fn.length >= 2) fn(name, value);
  else fn({ target: { name, value } });
}

const renderCheckbox = ({ key, name, label, inlineText = null, checked, onChange, disabled = false }) => {
  if (inlineText) {
    return (
      <Box key={key} sx={{ display: "flex", alignItems: "center", mt: 1 }}>
        <Typography sx={{ mr: 2 }}>{inlineText}</Typography>
        <Checkbox
          disabled={disabled}
          checked={!!checked}
          onChange={(e) => callOnChange(onChange, name, e.target.checked)}
        />
      </Box>
    );
  }

  return (
    <FormGroup key={key} sx={{ mt: 1 }}>
      <FormControlLabel
        control={
          <Checkbox
            disabled={disabled}
            checked={!!checked}
            onChange={(e) => callOnChange(onChange, name, e.target.checked)}
          />
        }
        label={label}
      />
    </FormGroup>
  );
};

export default renderCheckbox;
