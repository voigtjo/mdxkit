import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation, useNavigate } from 'react-router-dom';

import RoleVisible from './routes/RoleVisible';
import DebugGate from './debug/DebugGate';

import Home from './components/Home';
import ManageForms from './components/ManageForms';
import UserForm from './components/UserForm';

import { TenantProvider, useTenant } from './context/TenantContext';
import TenantGate from './components/TenantGate';
import TenantBar from './components/TenantBar';

import AdminIndex from './components/AdminIndex';
import AdminUsers from './components/AdminUsers';
import AdminGroups from './components/AdminGroups';

import SystemHome from './components/system/SystemHome';
import TenantAdmin from './components/system/TenantAdmin';
import TenantAdmins from './components/system/TenantAdmins';

import AuthProvider, { useAuth } from './context/AuthContext';
import AuthGate from './components/AuthGate';
import HeaderUser from './components/HeaderUser';

import AccountChangePassword from './components/AccountChangePassword';
import SysAdminAdmin from './components/system/SysAdminAdmin';

import GroupProvider from './context/GroupContext';
import GroupGate from './components/GroupGate';
import GroupHome from './components/GroupHome';
import { useGroup } from './context/GroupContext';

import { Box, Button, Typography } from '@mui/material';

/** Nutzt aktive Gruppe, wenn __ACTIVE__ in Ziel enthalten ist */
function TenantRedirect({ to }) {
  const { tenantId } = useTenant();
  const { groupId } = useGroup();
  if (!tenantId) return <Navigate to="/" replace />;

  let target = to || '';
  if (target.includes('group/__ACTIVE__')) {
    if (!groupId) return <Navigate to={`/tenant/${encodeURIComponent(tenantId)}`} replace />;
    target = target.replace('group/__ACTIVE__', `group/${encodeURIComponent(groupId)}`);
  }
  return <Navigate to={`/tenant/${encodeURIComponent(tenantId)}/${target}`} replace />;
}

/** Legacy */
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

/**
 * Startseite:
 * - versucht Auto-Redirect (Sys → /system, sonst → /tenant/<tid>)
 * - zeigt zusätzlich Buttons als Fallback („Zum Tenant wechseln“ / „Systembereich öffnen“)
 * - zeigt Notiz, falls kein Tenant vorhanden ist
 */
function RootLanding() {
  const { user } = useAuth();
  const { tenantId: ctxTid } = useTenant();
  const nav = useNavigate();

  const isSys = !!user?.isSystemAdmin;
  const tid = ctxTid || user?.tenantId || user?.tenant?.tenantId || null;

  React.useEffect(() => {
    if (!user) return; // AuthGate übernimmt
    if (isSys) {
      nav('/system', { replace: true });
      return;
    }
    if (tid) {
      nav(`/tenant/${encodeURIComponent(tid)}`, { replace: true });
      return;
    }
  }, [user, isSys, tid, nav]);

  // Fallback UI (zeigt Buttons, falls der Redirect noch nicht gegriffen hat)
  return (
    <Box sx={{ p: 4 }}>
      {!isSys && tid && (
        <>
          <Typography variant="h5" gutterBottom>Weiter zum Tenant</Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Du hast Zugriff auf den Mandanten <code>{tid}</code>.
          </Typography>
          <Button
            variant="contained"
            onClick={() => nav(`/tenant/${encodeURIComponent(tid)}`, { replace: true })}
          >
            Zum Tenant wechseln
          </Button>
        </>
      )}

      {isSys && (
        <>
          <Typography variant="h5" gutterBottom>Systemverwaltung</Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Du bist Systemadministrator.
          </Typography>
          <Button
            variant="contained"
            onClick={() => nav('/system', { replace: true })}
          >
            Systembereich öffnen
          </Button>
        </>
      )}

      {!isSys && !tid && (
        <>
          <Typography variant="h5" gutterBottom>Kein Tenant zugeordnet</Typography>
          <Typography variant="body1">
            Für dieses Konto ist kein Mandant hinterlegt. Bitte wende dich an einen Administrator.
          </Typography>
        </>
      )}
    </Box>
  );
}

function LayoutWithConditionalHeader({ children }) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const isSysAdmin = !!user?.isSystemAdmin;
  const nav = useNavigate();
  const loc = useLocation();

  // Sanfter Schutz innerhalb der App – RootLanding übernimmt den ersten Redirect.
  React.useEffect(() => {
    if (!user) return;
    const effectiveTid = tenantId || user?.tenantId || user?.tenant?.tenantId || null;
    const p = loc.pathname || '';
    const isTenantPath  = p.startsWith('/tenant/');
    const isAccountPath = p.startsWith('/account/') || p.includes('/account/change-password');

    if (!isSysAdmin) {
      if (!isTenantPath && !isAccountPath && effectiveTid) {
        nav(`/tenant/${encodeURIComponent(effectiveTid)}`, { replace: true });
      }
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
      <Router>
        <TenantProvider>
          <GroupProvider>
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

                    {/* Passwort ändern */}
                    <Route path="/account/change-password" element={<AccountChangePassword />} />
                    <Route path="/tenant/:tenantId/account/change-password" element={<AccountChangePassword />} />
                    <Route path="/account/password" element={<AccountChangePassword />} />
                    <Route path="/tenant/:tenantId/account/password" element={<AccountChangePassword />} />

                    {/* Tenant-Home = Verwaltung */}
                    <Route path="/tenant/:tenantId" element={<Home />} />

                    {/* Group-Scope */}
                    <Route
                      path="/tenant/:tenantId/group/:groupId"
                      element={
                        <GroupGate>
                          <GroupHome />
                        </GroupGate>
                      }
                    />
                    <Route
                      path="/tenant/:tenantId/group/:groupId/admin/*"
                      element={
                        <RoleVisible allow={['TenantAdmin','FormAuthor','FormPublisher']}>
                          <GroupGate>
                            <AdminIndex />
                          </GroupGate>
                        </RoleVisible>
                      }
                    />
                    <Route
                      path="/tenant/:tenantId/group/:groupId/manage"
                      element={
                        <RoleVisible allow={['Operator','TenantAdmin']}>
                          <GroupGate>
                            <ManageForms />
                          </GroupGate>
                        </RoleVisible>
                      }
                    />
                    <Route
                      path="/tenant/:tenantId/group/:groupId/formular/:formName/:userId"
                      element={
                        <RoleVisible allow={['FormDataEditor','FormPublisher','Operator']}>
                          <GroupGate>
                            <UserForm />
                          </GroupGate>
                        </RoleVisible>
                      }
                    />
                    <Route
                      path="/tenant/:tenantId/group/:groupId/formular-test/:formName"
                      element={
                        <RoleVisible allow={['FormDataEditor','FormPublisher','Operator']}>
                          <GroupGate>
                            <UserForm />
                          </GroupGate>
                        </RoleVisible>
                      }
                    />

                    {/* Tenant-Admin (ohne Group-Scope) */}
                    <Route
                      path="/tenant/:tenantId/admin/users"
                      element={
                        <RoleVisible allow={['TenantAdmin']}>
                          <AdminUsers />
                        </RoleVisible>
                      }
                    />
                    <Route
                      path="/tenant/:tenantId/admin/groups"
                      element={
                        <RoleVisible allow={['TenantAdmin']}>
                          <AdminGroups />
                        </RoleVisible>
                      }
                    />

                    {/* Legacy-Redirects */}
                    <Route path="/admin" element={<TenantRedirect to="admin" />} />
                    <Route path="/admin/forms" element={<TenantRedirect to="admin/forms" />} />
                    <Route path="/admin/users" element={<TenantRedirect to="admin/users" />} />
                    <Route path="/manage" element={<TenantRedirect to="group/__ACTIVE__/manage" />} />
                    <Route path="/formular/:formName/:userId" element={<LegacyToTenantPrefix />} />
                    <Route path="/formular-test/:formName" element={<TenantRedirect to="group/__ACTIVE__/formular-test/:formName" />} />

                    {/* Start & Fallback */}
                    <Route path="/" element={<RootLanding />} />
                    <Route path="*" element={<p className="p-4 text-red-600">❌ Seite nicht gefunden</p>} />
                  </Routes>
                </TenantGate>
              </AuthGate>
            </LayoutWithConditionalHeader>
          </GroupProvider>
        </TenantProvider>
      </Router>
    </AuthProvider>
  );
};

export default App;
