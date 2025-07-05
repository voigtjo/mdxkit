import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        pt: 6,
        px: 4,
      }}
    >
      <Box sx={{ textAlign: "left", width: "100%", maxWidth: 600 }}>
        <Typography variant="h4" gutterBottom>
          Formular-System
        </Typography>
        <Typography variant="body1" gutterBottom>
          Willkommen! Bitte wähle einen Modus:
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <Button
            component={Link}
            to="/admin"
            variant="contained"
            color="primary"
          >
            Formularadministration
          </Button>
          <Button
            component={Link}
            to="/manage"
            variant="outlined"
            color="primary"
          >
            Formularzuweisung
          </Button>
          <Button
            component={Link}
            to="/admin/format"
            variant="outlined"
            color="secondary"
          >
            Formatvorlagen verwalten
          </Button>
          <Button
            component={Link}
            to="/admin/print"
            variant="outlined"
            color="secondary"
          >
            Druckvorlagen verwalten
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Home;
