// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';

import Home from './components/Home';
import AdminForms from './components/AdminForms';
import ManageForms from './components/ManageForms';
import UserForm from './components/UserForm';
import FormatForm from './components/FormatForm';

import { TenantProvider } from './context/TenantContext';
import { useTenant } from './context/TenantContext';
import TenantGate from './components/TenantGate';
import TenantBar from './components/TenantBar';

// Admin-Tabs-Container (neu)
import AdminIndex from './components/AdminIndex';
// Für direkte Loads bleibt die Users-Page separat importierbar
import AdminUsers from './components/AdminUsers';

import SystemHome from './components/system/SystemHome';
import TenantAdmin from './components/system/TenantAdmin';

// Kleiner Redirect-Helper für alte Pfade
function TenantRedirect({ to }) {
  const { tenantId } = useTenant();
  if (!tenantId) return <Navigate to="/" replace />;
  return <Navigate to={`/tenant/${encodeURIComponent(tenantId)}/${to}`} replace />;
}

// Wrapper: zeigt TenantBar nur außerhalb von /system/*
function LayoutWithOptionalTenantBar({ children }) {
  const location = useLocation();
  const isSystem = location.pathname.startsWith('/system');
  return (
    <>
      {!isSystem && <TenantBar />}
      {children}
    </>
  );
}

const App = () => {
  return (
    <TenantProvider>
      <Router>
        <LayoutWithOptionalTenantBar>
          <TenantGate>
            <Routes>
              {/* Systembereich (ohne TenantBar) */}
              <Route path="/system" element={<SystemHome />} />
              <Route path="/system/tenants" element={<TenantAdmin />} />

              {/* Tenant-Bereich */}
              <Route path="/tenant/:tenantId" element={<Home />} />

              {/* Admin-Einstieg mit Tabs */}
              <Route path="/tenant/:tenantId/admin" element={<AdminIndex />} />
              <Route path="/tenant/:tenantId/admin/forms" element={<AdminIndex />} />
              <Route path="/tenant/:tenantId/admin/users" element={<AdminIndex />} />
              <Route path="/tenant/:tenantId/admin/groups" element={<AdminIndex />} />

              {/* Bestehende Seiten bleiben erreichbar */}
              <Route path="/tenant/:tenantId/manage" element={<ManageForms />} />

              {/* Form-Workflows (Legacy-Param-Namen beibehalten) */}
              <Route path="/tenant/:tenantId/formular/:formName/:patientId" element={<UserForm />} />
              <Route path="/tenant/:tenantId/formular-test/:formName" element={<UserForm />} />

              {/* Admin-Subseiten (außerhalb Tabs) */}
              <Route path="/tenant/:tenantId/admin/format" element={<FormatForm />} />
              <Route path="/tenant/:tenantId/admin/print" element={<FormatForm />} />

              {/* Legacy-Pfade → automatisch tenantisiert */}
              <Route path="/admin" element={<TenantRedirect to="admin" />} />
              <Route path="/admin/forms" element={<TenantRedirect to="admin/forms" />} />
              <Route path="/admin/users" element={<TenantRedirect to="admin/users" />} />
              <Route path="/manage" element={<TenantRedirect to="manage" />} />
              <Route path="/admin/format" element={<TenantRedirect to="admin/format" />} />
              <Route path="/admin/print" element={<TenantRedirect to="admin/print" />} />
              <Route path="/formular/:formName/:patientId" element={<TenantRedirect to="formular/:formName/:patientId" />} />
              <Route path="/formular-test/:formName" element={<TenantRedirect to="formular-test/:formName" />} />

              {/* Start & Fallback */}
              <Route path="/" element={<Home />} />
              <Route path="*" element={<p className="p-4 text-red-600">❌ Seite nicht gefunden</p>} />
            </Routes>
          </TenantGate>
        </LayoutWithOptionalTenantBar>
      </Router>
    </TenantProvider>
  );
};

export default App;
