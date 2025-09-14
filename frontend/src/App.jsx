// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router-dom';

import RoleVisible from './routes/RoleVisible';
import DebugGate from './debug/DebugGate';

import Home from './components/Home';
import ManageForms from './components/ManageForms';
import UserForm from './components/UserForm';

import { TenantProvider } from './context/TenantContext';
import { useTenant } from './context/TenantContext';
import TenantGate from './components/TenantGate';
import TenantBar from './components/TenantBar';

import AdminIndex from './components/AdminIndex';
import AdminUsers from './components/AdminUsers';

import SystemHome from './components/system/SystemHome';
import TenantAdmin from './components/system/TenantAdmin';
import TenantAdmins from './components/system/TenantAdmins'; // ✅ neue Seite (Tenant-Admin-Verwaltung)

import AuthProvider, { useAuth } from './context/AuthContext';
import AuthGate from './components/AuthGate';
import HeaderUser from './components/HeaderUser';

import AccountChangePassword from './components/AccountChangePassword';
import SysAdminAdmin from './components/system/SysAdminAdmin';

function TenantRedirect({ to }) {
  const { tenantId } = useTenant();
  if (!tenantId) return <Navigate to="/" replace />;
  return <Navigate to={`/tenant/${encodeURIComponent(tenantId)}/${to}`} replace />;
}

function LegacyToTenantPrefix() {
  const { tenantId } = useTenant();
  const { formName, userId } = useParams();
  if (!tenantId) return <Navigate to="/" replace />;
  return (
    <Navigate
      to={`/tenant/${encodeURIComponent(tenantId)}/formular/${encodeURIComponent(formName)}/${encodeURIComponent(userId)}`}
      replace
    />
  );
}

function LayoutWithConditionalHeader({ children }) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const isSysAdmin = !!user?.isSystemAdmin;
  const nav = useNavigate();
  const loc = useLocation();

  React.useEffect(() => {
    if (!user || isSysAdmin) return;
    if (!tenantId) return;
    const p = loc.pathname || '';
    const isTenantPath  = p.startsWith('/tenant/');
    const isAccountPath = p.startsWith('/account/') || p.includes('/account/change-password');
    if (!isTenantPath && !isAccountPath) {
      nav(`/tenant/${encodeURIComponent(tenantId)}`, { replace: true });
    }
  }, [user, isSysAdmin, tenantId, loc.pathname, nav]);

  if (!user) return children;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 12px' }}>
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
                  {/* Systembereich */}
                  <Route path="/system" element={<SystemHome />} />
                  <Route path="/system/tenants" element={<TenantAdmin />} />
                  <Route path="/system/tenants/admins" element={<TenantAdmins />} />
                  <Route path="/system/admins" element={<SysAdminAdmin />} />

                  {/* Passwort ändern – ohne & mit Tenant-Prefix (+ Aliase) */}
                  <Route path="/account/change-password" element={<AccountChangePassword />} />
                  <Route path="/tenant/:tenantId/account/change-password" element={<AccountChangePassword />} />
                  <Route path="/account/password" element={<AccountChangePassword />} />
                  <Route path="/tenant/:tenantId/account/password" element={<AccountChangePassword />} />

                  {/* Tenant-Bereich */}
                  <Route
                    path="/tenant/:tenantId"
                    element={
                      <RoleVisible allow={['TenantAdmin','FormAuthor','FormPublisher','Operator']}>
                        <Home />
                      </RoleVisible>
                    }
                  />

                  {/* Admin (→ TenantAdmin darf hier hinein) */}
                  <Route
                    path="/tenant/:tenantId/admin"
                    element={
                      <RoleVisible allow={['TenantAdmin','FormAuthor','FormPublisher']}>
                        <AdminIndex />
                      </RoleVisible>
                    }
                  />
                  <Route
                    path="/tenant/:tenantId/admin/forms"
                    element={
                      <RoleVisible allow={['TenantAdmin','FormAuthor','FormPublisher']}>
                        <AdminIndex />
                      </RoleVisible>
                    }
                  />
                  <Route
                    path="/tenant/:tenantId/admin/users"
                    element={
                      <RoleVisible allow={['TenantAdmin','FormAuthor','FormPublisher']}>
                        <AdminUsers /> {/* ✅ spezielle Benutzerverwaltung */}
                      </RoleVisible>
                    }
                  />
                  <Route
                    path="/tenant/:tenantId/admin/groups"
                    element={
                      <RoleVisible allow={['TenantAdmin','FormAuthor','FormPublisher']}>
                        <AdminIndex />
                      </RoleVisible>
                    }
                  />

                  {/* Manage (nur Operator) */}
                  <Route
                    path="/tenant/:tenantId/manage"
                    element={
                      <RoleVisible allow={['Operator','TenantAdmin']}>
                        <ManageForms />
                      </RoleVisible>
                    }
                  />

                  {/* Form-Workflows */}
                  <Route
                    path="/tenant/:tenantId/formular/:formName/:userId"
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

                  {/* Legacy-Pfade */}
                  <Route path="/admin" element={<TenantRedirect to="admin" />} />
                  <Route path="/admin/forms" element={<TenantRedirect to="admin/forms" />} />
                  <Route path="/admin/users" element={<TenantRedirect to="admin/users" />} />
                  <Route path="/manage" element={<TenantRedirect to="manage" />} />
                  <Route path="/formular/:formName/:userId" element={<LegacyToTenantPrefix />} />
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
