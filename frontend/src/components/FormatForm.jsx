import React from 'react';
import { Button, Container, Typography } from '@mui/material';
import { Link, useParams } from 'react-router-dom';

export default function FormatForm() {
  const { tenantId } = useParams();

  return (
    <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="h5" gutterBottom>
        Vorlagenverwaltung entfernt
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Die frühere Verwaltung von Format-/Druckvorlagen wurde aus dem System entfernt.
      </Typography>
      <Button
        component={Link}
        to={tenantId ? `/tenant/${encodeURIComponent(tenantId)}` : '/'}
        variant="contained"
      >
        Zurück zum Tenant
      </Button>
    </Container>
  );
}
