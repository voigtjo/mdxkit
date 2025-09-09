// src/components/system/SystemHome.jsx
import React from "react";
import { Box, Paper, Typography, Button, Stack, Alert } from "@mui/material";
import { Link } from "react-router-dom";
import SettingsIcon from "@mui/icons-material/Settings";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import { useAuth } from "@/context/AuthContext";

export default function SystemHome() {
  const { user } = useAuth();

  if (!user?.isSystemAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Nur für System-Administratoren.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Systembereich
      </Typography>

      {/* Mandantenverwaltung */}
      <Paper sx={{ p: 3, mb: 2 }}>
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

      {/* SysAdmin-Verwaltung */}
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <AdminPanelSettingsIcon />
          <Box>
            <Typography variant="h6">System-Admins</Typography>
            <Typography variant="body2" color="text.secondary">
              SysAdmins einladen, sperren, Rechte entziehen.
            </Typography>
          </Box>
          <Box sx={{ ml: "auto" }}>
            <Button
              component={Link}
              to="/system/admins"
              variant="contained"
              color="secondary"
            >
              Zu /system/admins
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
