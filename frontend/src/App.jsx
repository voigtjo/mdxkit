// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';

import RoleVisible from './routes/RoleVisible';
import DebugGate from './debug/DebugGate';

import Home from './components/Home';
import AdminForms from './components/AdminForms';
import ManageForms from './components/ManageForms';
import UserForm from './components/UserForm';
import FormatForm from './components/FormatForm';

import { TenantProvider } from './context/TenantContext';
import { useTenant } from './context/TenantContext';
import TenantGate from './components/TenantGate';
import TenantBar from './components/TenantBar';

import AdminIndex from './components/AdminIndex';
import AdminUsers from './components/AdminUsers';

import SystemHome from './components/system/SystemHome';
import TenantAdmin from './components/system/TenantAdmin';

import AuthProvider, { useAuth } from './context/AuthContext';
import AuthGate from './components/AuthGate';
import HeaderUser from './components/HeaderUser';

// Kleiner Redirect-Helper für alte Pfade
function TenantRedirect({ to }) {
  const { tenantId } = useTenant();
  if (!tenantId) return <Navigate to="/" replace />;
  return <Navigate to={`/tenant/${encodeURIComponent(tenantId)}/${to}`} replace />;
}

/**
 * Header-Wrapper:
 * - Links: TenantBar nur für SysAdmins
 * - Rechts: HeaderUser für alle eingeloggten User
 */
function LayoutWithConditionalHeader({ children }) {
  const { user } = useAuth();
  const isSysAdmin = !!user?.isSystemAdmin;

  if (!user) {
    // gar kein Header im Login/Register
    return children;
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '8px 12px',
        }}
      >
        {isSysAdmin ? <TenantBar /> : <div />} {/* Links leer außer bei SysAdmin */}
        <HeaderUser /> {/* Rechts immer */}
      </div>
      {children}
    </>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <TenantProvider>
        <Router>
          <DebugGate /> 
          <LayoutWithConditionalHeader>
            <AuthGate>
              <TenantGate>
                <Routes>
                  {/* Systembereich */}
                  <Route path="/system" element={<SystemHome />} />
                  <Route path="/system/tenants" element={<TenantAdmin />} />

                  {/* Tenant-Bereich */}
                  <Route
                    path="/tenant/:tenantId"
                    element={
                      <RoleVisible allow={['FormAuthor','FormPublisher','Operator']}>
                        <Home />
                      </RoleVisible>
                    }
                  />

                  {/* Admin (FormAuthor ODER FormPublisher) */}
                  <Route
                    path="/tenant/:tenantId/admin"
                    element={
                      <RoleVisible allow={['FormAuthor','FormPublisher']}>
                        <AdminIndex />
                      </RoleVisible>
                    }
                  />
                  <Route
                    path="/tenant/:tenantId/admin/forms"
                    element={
                      <RoleVisible allow={['FormAuthor','FormPublisher']}>
                        <AdminIndex />
                      </RoleVisible>
                    }
                  />
                  <Route
                    path="/tenant/:tenantId/admin/users"
                    element={
                      <RoleVisible allow={['FormAuthor','FormPublisher']}>
                        <AdminIndex />
                      </RoleVisible>
                    }
                  />
                  <Route
                    path="/tenant/:tenantId/admin/groups"
                    element={
                      <RoleVisible allow={['FormAuthor','FormPublisher']}>
                        <AdminIndex />
                      </RoleVisible>
                    }
                  />

                  {/* Manage (nur Operator) */}
                  <Route
                    path="/tenant/:tenantId/manage"
                    element={
                      <RoleVisible allow={['Operator']}>
                        <ManageForms />
                      </RoleVisible>
                    }
                  />

                  {/* Form-Workflows */}
                  <Route
                    path="/tenant/:tenantId/formular/:formName/:patientId"
                    element={
                      <RoleVisible allow={['FormDataEditor','FormPublisher','Operator']}>
                        <UserForm />
                      </RoleVisible>
                    }
                  />
                  <Route
                    path="/tenant/:tenantId/formular-test/:formName"
                    element={
                      <RoleVisible allow={['FormDataEditor','FormPublisher','Operator']}>
                        <UserForm />
                      </RoleVisible>
                    }
                  />

                  {/* Admin-Subseiten */}
                  <Route
                    path="/tenant/:tenantId/admin/format"
                    element={
                      <RoleVisible allow={['FormAuthor','FormPublisher']}>
                        <FormatForm />
                      </RoleVisible>
                    }
                  />
                  <Route
                    path="/tenant/:tenantId/admin/print"
                    element={
                      <RoleVisible allow={['FormAuthor','FormPublisher']}>
                        <FormatForm />
                      </RoleVisible>
                    }
                  />

                  {/* Legacy-Pfade */}
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
            </AuthGate>
          </LayoutWithConditionalHeader>
        </Router>
      </TenantProvider>
    </AuthProvider>
  );
};

export default App;
