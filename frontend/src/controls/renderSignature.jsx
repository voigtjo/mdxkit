import React, { useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Box, Typography, Button } from "@mui/material";

function callOnChange(fn, name, value) {
  if (typeof fn !== "function") return;
  if (fn.length >= 2) fn(name, value);
  else fn({ target: { name, value } });
}

/**
 * Signatur-Feld.
 * - readOnly + value ⇒ zeigt Bild der Signatur
 * - sonst Canvas; bei Stiftbewegung wird DataURL via onChange(name, dataUrl) gesendet
 */
const renderSignature = ({ key, name = "signature", value = "", onChange, sigRef, readOnly = false }) => {
  const localRef = useRef(null);
  const ref = sigRef || localRef;

  // Wenn readOnly & Bild vorhanden → nur Bild anzeigen
  if (readOnly) {
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
            backgroundColor: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {value ? (
            // gespeicherte DataURL
            <img src={value} alt="Signature" style={{ maxHeight: "100%", maxWidth: "100%" }} />
          ) : (
            <Typography variant="body2" sx={{ color: "#999" }}>
              (Keine Unterschrift vorhanden)
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  const handleEnd = () => {
    try {
      const data = ref.current?.toDataURL?.();
      if (data) callOnChange(onChange, name, data);
    } catch {}
  };

  const handleClear = () => {
    try {
      ref.current?.clear?.();
      callOnChange(onChange, name, "");
    } catch {}
  };

  // Falls es bereits einen Wert gibt (z. B. beim Re-Render), zeigen wir ihn über dem Canvas an
  // (Canvas "replayen" wäre aufwändig, daher zeigen wir Bild + Canvas zum Überschreiben)
  return (
    <Box key={key} sx={{ mt: 3 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Unterschrift:
      </Typography>

      {value ? (
        <Box sx={{ mb: 1, p: 1, border: "1px dashed #ccc", borderRadius: 1, background: "#fafafa" }}>
          <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
            Aktuell gespeichert:
          </Typography>
          <img src={value} alt="Signature saved" style={{ maxHeight: 80, maxWidth: "100%" }} />
        </Box>
      ) : null}

      <Box
        sx={{
          border: "2px solid #ccc",
          borderRadius: 2,
          width: "100%",
          height: 120,
          overflow: "hidden",
          backgroundColor: "#fff",
        }}
      >
        <SignatureCanvas
          ref={ref}
          penColor="black"
          onEnd={handleEnd}
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

      <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
        <Button onClick={handleEnd} variant="outlined" size="small">
          Übernehmen
        </Button>
        <Button onClick={handleClear} variant="text" size="small">
          Löschen
        </Button>
      </Box>
    </Box>
  );
};

export default renderSignature;
