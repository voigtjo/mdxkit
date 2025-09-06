import React from "react";
import { Box, Checkbox, Typography } from "@mui/material";

function callOnChange(fn, name, value) {
  if (typeof fn !== "function") return;
  if (fn.length >= 2) fn(name, value);
  else fn({ target: { name, value } });
}

const renderInlineCheckbox = ({ key, name, text, checked, onChange, disabled = false }) => {
  return (
    <Box key={key} sx={{ display: "flex", alignItems: "center", mt: 1 }}>
      <Typography sx={{ mr: 2 }}>{text}</Typography>
      <Checkbox
        disabled={disabled}
        checked={!!checked}
        onChange={(e) => callOnChange(onChange, name, e.target.checked)}
      />
    </Box>
  );
};

export default renderInlineCheckbox;
