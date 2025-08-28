import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

// Optional: Subdomain → tenant ableiten (tenant.example.com)
function getTenantFromSubdomain() {
  const host = window.location.hostname; // z.B. dev.myapp.com
  const parts = host.split('.');
  if (parts.length > 2) {
    const sub = parts[0];
    if (sub && sub !== 'www') return sub;
  }
  return null;
}

const TenantContext = createContext({ tenantId: null, setTenantId: () => {} });

export const TenantProvider = ({ children }) => {
  const [tenantId, setTenantIdState] = useState(null);

  useEffect(() => {
    // 1) localStorage Vorrang
    const stored = localStorage.getItem('tenantId');
    if (stored) {
      setTenantIdState(stored);
      return;
    }
    // 2) Subdomain Fallback
    const fromSub = getTenantFromSubdomain();
    if (fromSub) {
      localStorage.setItem('tenantId', fromSub);
      setTenantIdState(fromSub);
    }
  }, []);

  const setTenantId = (id) => {
    const trimmed = (id || '').trim();
    // simple Validierung (Buchstaben/Zahlen/Bindestrich/Unterstrich, 2–64 chars)
    if (!/^[a-zA-Z0-9_-]{2,64}$/.test(trimmed)) {
      alert('Ungültige Tenant-ID (erlaubt: a–Z, 0–9, _ , -, Länge 2–64)');
      return;
    }
    localStorage.setItem('tenantId', trimmed);
    setTenantIdState(trimmed);
  };

  const clearTenantId = () => {
    localStorage.removeItem('tenantId');
    setTenantIdState(null);
  };

  const value = useMemo(() => ({ tenantId, setTenantId, clearTenantId }), [tenantId]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
