// src/components/Home.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { Box, Button, Paper, Stack, Typography, Divider, FormControl, InputLabel, Select, MenuItem, Alert } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { tenantId: ctxTid } = useTenant();
  const { tenantId: urlTid } = useParams();
  const { user } = useAuth();

  const tid =
    urlTid ||
    ctxTid ||
    user?.tenant?.tenantId ||
    user?.tenantId ||
    '';

  const isTenantAdmin = !!user?.isTenantAdmin;

  // ---- Gruppen aus dem DTO ----
  const groups = useMemo(
    () => (Array.isArray(user?.groups) ? user.groups : []),
    [user]
  );

  // Default: bevorzugt Default-Gruppe (user.defaultGroupId -> matching _id in groups),
  // sonst erste Gruppe.
  const computeInitialGroupId = () => {
    const defId = user?.defaultGroupId ? String(user.defaultGroupId) : null;
    if (defId) {
      const hit = groups.find(g => String(g._id) === defId);
      if (hit) return hit.groupId; // Public-ID
    }
    return groups[0]?.groupId || '';
  };

  const [groupId, setGroupId] = useState(computeInitialGroupId());

  useEffect(() => {
    // Falls Gruppen erst asynchron kommen, nachziehen
    const wanted = computeInitialGroupId();
    if (wanted && groupId !== wanted) setGroupId(wanted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, user?.defaultGroupId]);

  return (
    <Box sx={{ p: 3 }}>
      {!urlTid && !!tid && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Du bist noch nicht im Mandantenbereich. Du kannst ihn hier öffnen:&nbsp;
          <Button
            component={Link}
            to={`/tenant/${encodeURIComponent(tid)}`}
            variant="outlined"
            size="small"
          >
            Tenant öffnen
          </Button>
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Tenant-Verwaltung</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Verwalte Benutzer und Gruppen deines Tenants.
        </Typography>

        <Stack direction="row" spacing={2} flexWrap="wrap">
          {isTenantAdmin && (
            <>
              <Button
                component={Link}
                to={tid ? `/tenant/${encodeURIComponent(tid)}/admin/users` : '#'}
                variant="contained"
                disabled={!tid}
              >
                Benutzerverwaltung
              </Button>
              <Button
                component={Link}
                to={tid ? `/tenant/${encodeURIComponent(tid)}/admin/groups` : '#'}
                variant="outlined"
                disabled={!tid}
              >
                Gruppenverwaltung
              </Button>
            </>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Formular-Funktionen</Typography>

        {!tid && (
          <Typography variant="body2">
            Für Formular-Funktionen benötigst du einen Mandanten. Bitte wende dich an einen Administrator.
          </Typography>
        )}

        {!!tid && (
          <>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Wähle eine Gruppe und öffne den Gruppenbereich oder direkt die Unterseiten.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="group-select-label">Gruppe</InputLabel>
                <Select
                  labelId="group-select-label"
                  label="Gruppe"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                >
                  {groups.length === 0 && (
                    <MenuItem value="" disabled>
                      Keine Gruppen verfügbar
                    </MenuItem>
                  )}
                  {groups.map(g => (
                    <MenuItem key={g.groupId} value={g.groupId}>
                      {g.name || g.key || g.groupId}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                component={Link}
                to={groupId ? `/tenant/${encodeURIComponent(tid)}/group/${encodeURIComponent(groupId)}` : '#'}
                variant="contained"
                disabled={!groupId}
              >
                Gruppenbereich öffnen
              </Button>

              <Button
                component={Link}
                to={groupId ? `/tenant/${encodeURIComponent(tid)}/group/${encodeURIComponent(groupId)}/admin` : '#'}
                variant="outlined"
                disabled={!groupId}
              >
                Formular-Admin
              </Button>

              <Button
                component={Link}
                to={groupId ? `/tenant/${encodeURIComponent(tid)}/group/${encodeURIComponent(groupId)}/manage` : '#'}
                variant="outlined"
                disabled={!groupId}
              >
                Formular-Zuweisung
              </Button>
            </Stack>

            <Divider sx={{ mt: 1 }} />

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Routen-Schema: <code>/tenant/&lt;tenantId&gt;/group/&lt;groupId&gt;/…</code>
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
}
