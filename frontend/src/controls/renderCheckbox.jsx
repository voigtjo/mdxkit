import React from "react";
import { Checkbox, FormControlLabel, FormGroup, Box, Typography } from "@mui/material";

/**
 * Renders a checkbox, either standalone or with inline label.
 * @param {Object} props
 * @param {string} props.key - React key
 * @param {string} props.name - Field name
 * @param {string} props.label - Label text
 * @param {string} [props.inlineText] - Optional text before checkbox
 * @param {boolean} props.checked - Checkbox state
 * @param {Function} props.onChange - Change handler
 */
const renderCheckbox = ({ key, name, label, inlineText = null, checked, onChange }) => {
  if (inlineText) {
    return (
      <Box key={key} sx={{ display: "flex", alignItems: "center", mt: 1 }}>
        <Typography sx={{ mr: 2 }}>{inlineText}</Typography>
        <Checkbox
          checked={checked}
          onChange={(e) => onChange(name, e.target.checked)}
        />
      </Box>
    );
  }

  return (
    <FormGroup key={key} sx={{ mt: 1 }}>
      <FormControlLabel
        control={
          <Checkbox
            checked={checked}
            onChange={(e) => onChange(name, e.target.checked)}
          />
        }
        label={label}
      />
    </FormGroup>
  );
};

export default renderCheckbox;
