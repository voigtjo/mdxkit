import React from 'react';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import LoginRegister from './LoginRegister';

export default function AuthGate({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Box sx={{ display:'grid', placeItems:'center', height:'60vh' }}><CircularProgress /></Box>;
    }
  if (!user) return <LoginRegister />;
  return children;
}
