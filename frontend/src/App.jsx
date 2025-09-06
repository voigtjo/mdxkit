// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import RoleVisible from './routes/RoleVisible';
import DebugGate from './debug/DebugGate';

import Home from './components/Home';
import AdminForms from './components/AdminForms';
import ManageForms from './components/ManageForms';
import UserForm from './components/UserForm';

import { TenantProvider } from './context/TenantContext';
import { useTenant } from './context/TenantContext';
import TenantGate from './components/TenantGate';
import TenantBar from './components/TenantBar';

import AdminIndex from './components/AdminIndex';
// import AdminUsers from './components/AdminUsers'; // nicht direkt geroutet, wird in AdminIndex geladen

import SystemHome from './components/system/SystemHome';
import TenantAdmin from './components/system/TenantAdmin';

import AuthProvider, { useAuth } from './context/AuthContext';
import AuthGate from './components/AuthGate';
import HeaderUser from './components/HeaderUser';

/* ---------- Legacy-Redirect (präfixt den aktuellen Pfad mit /tenant/:tid) ---------- */
function LegacyToTenantPrefix() {
  const { tenantId } = useTenant();
  const location = useLocation();
  if (!tenantId) return <Navigate to="/" replace />;
  // z.B. "/formular/foo/123" -> "/tenant/<tid>/formular/foo/123"
  return <Navigate to={`/tenant/${encodeURIComponent(tenantId)}${location.pathname}`} replace />;
}

/**
 * Header-Wrapper:
 * - Links: TenantBar nur für SysAdmins
 * - Rechts: HeaderUser für alle eingeloggten User
 */
function LayoutWithConditionalHeader({ children }) {
  const { user } = useAuth();
  const isSysAdmin = !!user?.isSystemAdmin;

  if (!user) return children;

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
        {isSysAdmin ? <TenantBar /> : <div />}
        <HeaderUser />
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
                  {/* Systembereich (nur SysAdmins) */}
                  <Route
                    path="/system"
                    element={
                      <RoleVisible allow={[]}>
                        <SystemHome />
                      </RoleVisible>
                    }
                  />
                  <Route
                    path="/system/tenants"
                    element={
                      <RoleVisible allow={[]}>
                        <TenantAdmin />
                      </RoleVisible>
                    }
                  />

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

                  {/* Legacy-Pfade → automatisch auf /tenant/:tid/<alterPfad> umbiegen */}
                  <Route path="/admin" element={<LegacyToTenantPrefix />} />
                  <Route path="/admin/forms" element={<LegacyToTenantPrefix />} />
                  <Route path="/admin/users" element={<LegacyToTenantPrefix />} />
                  <Route path="/manage" element={<LegacyToTenantPrefix />} />
                  <Route path="/formular/:formName/:patientId" element={<LegacyToTenantPrefix />} />
                  <Route path="/formular/:formName" element={<LegacyToTenantPrefix />} />
                  <Route path="/formular-test/:formName" element={<LegacyToTenantPrefix />} />

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
