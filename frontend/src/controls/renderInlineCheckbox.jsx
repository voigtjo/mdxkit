import React from "react";
import { Box, Checkbox, Typography } from "@mui/material";

/**
 * Renders an inline checkbox with pre-text.
 */
const renderInlineCheckbox = ({ key, name, text, checked, onChange }) => {
  return (
    <Box key={key} sx={{ display: "flex", alignItems: "center", mt: 1 }}>
      <Typography sx={{ mr: 2 }}>{text}</Typography>
      <Checkbox
        checked={checked}
        onChange={(e) => onChange(name, e.target.checked)}
      />
    </Box>
  );
};

export default renderInlineCheckbox;
