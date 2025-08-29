// frontend/src/components/AdminIndex.jsx
import React, { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Paper, Tabs, Tab, Stack, Typography } from '@mui/material';
import AdminForms from './AdminForms';
import AdminUsers from './AdminUsers';
import AdminGroups from './AdminGroups';

function useActiveAdminTab() {
  const location = useLocation();
  if (location.pathname.endsWith('/groups')) return 'groups';
  if (location.pathname.endsWith('/users')) return 'users';
  if (location.pathname.endsWith('/forms')) return 'forms';
  if (location.pathname.endsWith('/admin')) return 'forms';
  return 'forms';
}

export default function AdminIndex() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const active = useActiveAdminTab();

  const onChange = (_e, v) => {
    if (v === 'forms') navigate(`/tenant/${tenantId}/admin/forms`);
    if (v === 'users') navigate(`/tenant/${tenantId}/admin/users`);
    if (v === 'groups') navigate(`/tenant/${tenantId}/admin/groups`);
  };

  const content = useMemo(() => {
    if (active === 'users') return <AdminUsers />;
    if (active === 'groups') return <AdminGroups />;
    return <AdminForms />;
  }, [active]);

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h5">Administration</Typography>
        <Typography variant="body2" color="text.secondary">
          Mandant: <strong>{tenantId}</strong>
        </Typography>
      </Stack>

      <Paper elevation={1} sx={{ mb: 2 }}>
        <Tabs
          value={active}
          onChange={onChange}
          aria-label="Admin Tabs"
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab value="forms" label="Forms" />
          <Tab value="users" label="Users" />
          <Tab value="groups" label="Groups" />
        </Tabs>
      </Paper>

      <Box>{content}</Box>
    </Box>
  );
}
