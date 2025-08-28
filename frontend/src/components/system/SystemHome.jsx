import React from "react";
import { Box, Paper, Typography, Button, Stack } from "@mui/material";
import { Link } from "react-router-dom";
import SettingsIcon from "@mui/icons-material/Settings";

export default function SystemHome() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Systembereich
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <SettingsIcon />
          <Box>
            <Typography variant="h6">Mandantenverwaltung</Typography>
            <Typography variant="body2" color="text.secondary">
              Tenants anlegen, sperren/aktivieren, umbenennen.
            </Typography>
          </Box>
          <Box sx={{ ml: "auto" }}>
            <Button
              component={Link}
              to="/system/tenants"
              variant="contained"
              color="primary"
            >
              Zu /system/tenants
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
