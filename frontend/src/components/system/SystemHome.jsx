// frontend/src/components/system/SystemHome.jsx
import React from "react";
import { Box, Paper, Typography, Button, Stack, Alert } from "@mui/material";
import { Link } from "react-router-dom";
import SettingsIcon from "@mui/icons-material/Settings";
import SecurityIcon from "@mui/icons-material/Security";
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
    <Box sx={{ p: 3, display: 'grid', gap: 2 }}>
      <Typography variant="h4">Systembereich</Typography>

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
            <Button component={Link} to="/system/tenants" variant="contained" color="primary">
              Zu /system/tenants
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <SecurityIcon />
          <Box>
            <Typography variant="h6">System-Administratoren</Typography>
            <Typography variant="body2" color="text.secondary">
              SysAdmins einladen, sperren/aktivieren, Rechte entziehen.
            </Typography>
          </Box>
          <Box sx={{ ml: "auto" }}>
            <Button component={Link} to="/system/admins" variant="contained">
              Zu /system/admins
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <AdminPanelSettingsIcon />
          <Box>
            <Typography variant="h6">Tenant-Administratoren</Typography>
            <Typography variant="body2" color="text.secondary">
              Pro Tenant Admins verwalten und einladen.
            </Typography>
          </Box>
          <Box sx={{ ml: "auto" }}>
            <Button component={Link} to="/system/tenants/admins" variant="contained">
              Zu /system/tenants/admins
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
