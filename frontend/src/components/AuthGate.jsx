// src/components/AuthGate.jsx
import React, { useEffect, useMemo } from 'react';
import { CircularProgress, Box } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginRegister from './LoginRegister';

export default function AuthGate({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Beide Varianten zulassen (mit/ohne "change-"):
  // - /account/password
  // - /account/change-password
  // (sowie tenant-geprefixt, falls später gebraucht)
  const isChangePwRoute = useMemo(() => {
    const p = location.pathname;
    return (
      p === '/account/password' ||
      p === '/account/change-password' ||
      /^\/tenant\/[^/]+\/account\/password$/.test(p) ||
      /^\/tenant\/[^/]+\/account\/change-password$/.test(p)
    );
  }, [location.pathname]);

  // Flag robust lesen: mustChangePassword ODER forcePasswordChange
  const mustChangePassword = !!(user?.mustChangePassword || user?.forcePasswordChange);

  // Wenn eingeloggt & PW-Wechsel nötig & wir sind NICHT auf der PW-Seite → redirecten
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (mustChangePassword && !isChangePwRoute) {
      navigate('/account/password', {
        replace: true,
        state: { from: location.pathname + location.search },
      });
    }
  }, [loading, user, mustChangePassword, isChangePwRoute, navigate, location.pathname, location.search]);

  // Ladezustand
  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Nicht eingeloggt → Login/Register anzeigen
  if (!user) return <LoginRegister />;

  // Eingeloggt, PW-Wechsel erforderlich:
  // - auf PW-Seite: Kind rendern (z. B. <AccountPassword />)
  // - sonst: der useEffect übernimmt das Redirect; hier kurz nichts rendern
  if (mustChangePassword && !isChangePwRoute) {
    return null;
  }

  // Alles gut → regulär rendern
  return children;
}
