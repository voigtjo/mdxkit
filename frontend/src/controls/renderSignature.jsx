import React from "react";
import SignatureCanvas from "react-signature-canvas";
import { Box, Typography } from "@mui/material";

/**
 * Renders a signature canvas.
 */
const renderSignature = ({ key, sigRef, readOnly = false, defaultValue = null }) => {
  return (
    <Box key={key} sx={{ mt: 3 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Unterschrift:
      </Typography>
      <Box
        sx={{
          border: "2px solid #ccc",
          borderRadius: 2,
          width: "100%",
          height: 120,
          overflow: "hidden",
        }}
      >
        <SignatureCanvas
          ref={sigRef}
          penColor="black"
          canvasProps={{
            style: {
              width: "100%",
              height: "100%",
              display: "block",
              backgroundColor: "#fff",
            },
          }}
          clearOnResize={false}
        />
      </Box>
    </Box>
  );
};


export default renderSignature;
