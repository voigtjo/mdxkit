// Datei: src/controls/renderColumns.jsx
import React from "react";
import { Box } from "@mui/material";
import parseCell from "./parseCell.jsx";

const renderColumns = ({ key, widths, contents, values, onChange, sigRef, isReadOnly }) => {
  const total = widths.reduce((a, b) => a + b, 0);

  return (
    <Box key={key} sx={{ display: "flex", width: "100%", my: 2, gap: 2 }}>
      {contents.map((content, idx) => {
        const widthPercent = (widths[idx] / total) * 100;
        return (
          <Box
            key={idx}
            sx={{
              flexBasis: `${widthPercent}%`,
              flexGrow: 0,
              flexShrink: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            {parseCell((content || "").trim(), values, onChange, sigRef, isReadOnly)}
          </Box>
        );
      })}
    </Box>
  );
};

export default renderColumns;
