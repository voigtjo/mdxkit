// backend/middleware/authz.js
/**
 * Einheitliche Berechtigungsprüfung:
 * - SystemAdmin: darf alles (alle Tenants)
 * - TenantAdmin: darf alles im EIGENEN Tenant (req.tenantId)
 * - Sonst: über Rollen → Permissions
 *
 * Erwartet:
 *  - req.user: { isSystemAdmin, isTenantAdmin, tenantId, memberships: [{ groupId, roles: [...] }] }
 *  - req.tenantId: wird vom tenant-scope Router gesetzt (/api/tenant/:tenantId)
 */

const PERMISSIONS = {
  FORM_CREATE: 'FORM_CREATE',
  FORM_PUBLISH: 'FORM_PUBLISH',
  FORM_ASSIGN_TEMPLATES: 'FORM_ASSIGN_TEMPLATES',
  FORMDATA_EDIT: 'FORMDATA_EDIT',

  // optional: user/group mgmt falls vorhanden
  USER_MANAGE: 'USER_MANAGE',
  GROUP_MANAGE: 'GROUP_MANAGE',
};

// Mapping: Rolle → Permissions
const ROLE_PERMS = {
  FormAuthor: [PERMISSIONS.FORM_CREATE],
  FormPublisher: [PERMISSIONS.FORM_PUBLISH, PERMISSIONS.FORM_ASSIGN_TEMPLATES],
  Operator: [PERMISSIONS.FORMDATA_EDIT],

  // Admin-Rollen
  TenantAdmin: ['*'],  // alles innerhalb des Tenants
  SystemAdmin: ['*'],  // global alles
};

// ---- Helpers ----

function isSysAdmin(user) {
  return !!user?.isSystemAdmin;
}

function isTenantAdminHere(user, tenantId) {
  return !!user?.isTenantAdmin && user?.tenantId && tenantId && String(user.tenantId) === String(tenantId);
}

function rolesForUserInTenant(user, tenantId) {
  // Optional: wenn du Group-Scopes brauchst. Hier nehmen wir ALLE Rollen aus memberships (tenant-scope erfolgt im Backend ohnehin).
  const roles = new Set();
  for (const m of user?.memberships || []) {
    for (const r of m?.roles || []) roles.add(r);
  }
  // TenantAdmin/SystemAdmin “synthetisch” ergänzen
  if (isTenantAdminHere(user, tenantId)) roles.add('TenantAdmin');
  if (isSysAdmin(user)) roles.add('SystemAdmin');
  return Array.from(roles);
}

function userHasRole(user, tenantId, role) {
  if (role === 'SystemAdmin' && isSysAdmin(user)) return true;
  if (role === 'TenantAdmin' && isTenantAdminHere(user, tenantId)) return true;
  return rolesForUserInTenant(user, tenantId).includes(role);
}

function userHasPerm(user, tenantId, perm) {
  if (!user) return false;
  if (isSysAdmin(user)) return true;
  if (isTenantAdminHere(user, tenantId)) return true; // TenantAdmin: alles im Tenant

  // aus Rollen ableiten
  const roles = rolesForUserInTenant(user, tenantId);
  for (const role of roles) {
    const perms = ROLE_PERMS[role] || [];
    if (perms.includes('*') || perms.includes(perm)) return true;
  }
  return false;
}

// ---- Middlewares ----

function requireRoles(...roles) {
  return (req, res, next) => {
    const user = req.user;
    const tenantId = req.tenantId;

    if (!user) return res.status(401).json({ error: 'unauthenticated' });
    if (isSysAdmin(user)) return next();
    if (isTenantAdminHere(user, tenantId)) return next();

    const ok = roles.some(r => userHasRole(user, tenantId, r));
    if (!ok) return res.status(403).json({ error: 'forbidden' });
    return next();
  };
}

function requirePerm(perm) {
  return (req, res, next) => {
    const user = req.user;
    const tenantId = req.tenantId;

    if (!user) return res.status(401).json({ error: 'unauthenticated' });
    if (userHasPerm(user, tenantId, perm)) return next();

    return res.status(403).json({ error: 'forbidden' });
  };
}

function requireAnyPerm(...perms) {
  return (req, res, next) => {
    const user = req.user;
    const tenantId = req.tenantId;

    if (!user) return res.status(401).json({ error: 'unauthenticated' });
    if (isSysAdmin(user)) return next();
    if (isTenantAdminHere(user, tenantId)) return next();

    const ok = perms.some(p => userHasPerm(user, tenantId, p));
    if (!ok) return res.status(403).json({ error: 'forbidden' });
    return next();
  };
}

module.exports = {
  PERMISSIONS,
  requireRoles,
  requirePerm,
  requireAnyPerm,
};
