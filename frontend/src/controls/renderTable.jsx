// Datei: src/controls/renderTable.jsx
import React from "react";
import { Box } from "@mui/material";
import parseCell from "./parseCell.jsx";

const renderTable = ({ key, rows = [], values, onChange, sigRef, isReadOnly }) => {
  if (!rows.length) return null;

  // Header robust parsen:
  // [Tabelle (A | B | C)]  ODER  [Tabelle A | B | C]
  const rawHeader = rows[0];
  let headers = null;

  // 1) Mit Klammern
  let m = rawHeader.match(/^\[Tabelle\s*\((.*?)\)\s*]$/);
  if (m) {
    headers = m[1].split("|").map((h) => h.trim());
  } else {
    // 2) Ohne Klammern
    m = rawHeader.match(/^\[Tabelle\s+(.*?)]$/);
    if (m) headers = m[1].split("|").map((h) => h.trim());
  }

  if (!headers) return null;

  const dataRows = rows.slice(1).filter((line) => line.trim().startsWith("-"));

  return (
    <Box
      key={key}
      component="table"
      sx={{ width: "100%", borderCollapse: "collapse", my: 3 }}
    >
      <thead>
        <tr>
          {headers.map((header, idx) => (
            <th
              key={idx}
              style={{ border: "1px solid #ccc", padding: "8px", backgroundColor: "#f7f7f7", textAlign: "left" }}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {dataRows.map((line, rowIdx) => {
          const cells = line.replace(/^\s*-\s*/, "").split("|").map((c) => c.trim());
          return (
            <tr key={rowIdx}>
              {cells.map((cell, colIdx) => (
                <td
                  key={colIdx}
                  style={{ border: "1px solid #ccc", padding: "8px", verticalAlign: "top" }}
                >
                  {parseCell(cell, values, onChange, sigRef, isReadOnly)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </Box>
  );
};

export default renderTable;
