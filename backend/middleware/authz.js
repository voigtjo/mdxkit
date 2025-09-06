// backend/middleware/authz.js
/**
 * Einheitliche Berechtigungsprüfung:
 * - SystemAdmin: alles
 * - TenantAdmin: alles im eigenen Tenant (req.tenant)
 * - Sonst: Rollen → Permissions
 *
 * Erwartet:
 *  - req.user: { isSystemAdmin, isTenantAdmin, tenant, memberships:[{ groupId, roles:[] }] }
 *  - req.tenant: ObjectId des Tenants (aus tenantFromParam)
 */

const PERMISSIONS = {
  FORM_CREATE: 'form:create',
  FORM_PUBLISH: 'form:publish',
  FORM_ASSIGN: 'form:assign',
  FORMDATA_EDIT: 'formdata:edit',
  FORMDATA_PUBLISH: 'formdata:publish',
};

// Mapping: Rolle → Permissions (frei erweiterbar)
const ROLE_PERMS = {
  Viewer: [],
  Operator: [PERMISSIONS.FORMDATA_EDIT],
  Moderator: [PERMISSIONS.FORMDATA_EDIT, PERMISSIONS.FORM_PUBLISH, PERMISSIONS.FORM_ASSIGN],
  Admin: [
    PERMISSIONS.FORM_CREATE,
    PERMISSIONS.FORM_PUBLISH,
    PERMISSIONS.FORM_ASSIGN,
    PERMISSIONS.FORMDATA_EDIT,
    PERMISSIONS.FORMDATA_PUBLISH,
  ],
  // synthetische Super-Rollen
  TenantAdmin: ['*'],
  SystemAdmin: ['*'],
};

function sameId(a, b) {
  if (!a || !b) return false;
  return String(a) === String(b);
}

function isSysAdmin(user) {
  return !!user?.isSystemAdmin;
}

function isTenantAdminHere(user, tenantObjId) {
  return !!user?.isTenantAdmin && user?.tenant && sameId(user.tenant, tenantObjId);
}

function rolesForUserInTenant(user, tenantObjId) {
  const roles = new Set();
  for (const m of user?.memberships || []) {
    for (const r of m?.roles || []) roles.add(r);
  }
  if (isTenantAdminHere(user, tenantObjId)) roles.add('TenantAdmin');
  if (isSysAdmin(user)) roles.add('SystemAdmin');
  return Array.from(roles);
}

function userHasRole(user, tenantObjId, role) {
  if (role === 'SystemAdmin' && isSysAdmin(user)) return true;
  if (role === 'TenantAdmin' && isTenantAdminHere(user, tenantObjId)) return true;
  return rolesForUserInTenant(user, tenantObjId).includes(role);
}

function userHasPerm(user, tenantObjId, perm) {
  if (!user) return false;
  if (isSysAdmin(user)) return true;
  if (isTenantAdminHere(user, tenantObjId)) return true;
  const roles = rolesForUserInTenant(user, tenantObjId);
  for (const r of roles) {
    const perms = ROLE_PERMS[r] || [];
    if (perms.includes('*') || perms.includes(perm)) return true;
  }
  return false;
}

// ---- Middlewares ----
function requireRoles(...roles) {
  return (req, res, next) => {
    const user = req.user;
    const tenantObjId = req.tenant;
    if (!user) return res.status(401).json({ error: 'unauthenticated' });
    if (isSysAdmin(user)) return next();
    if (isTenantAdminHere(user, tenantObjId)) return next();
    const ok = roles.some(r => userHasRole(user, tenantObjId, r));
    if (!ok) return res.status(403).json({ error: 'forbidden' });
    return next();
  };
}

function requirePerm(perm) {
  return (req, res, next) => {
    const user = req.user;
    const tenantObjId = req.tenant;
    if (!user) return res.status(401).json({ error: 'unauthenticated' });
    if (userHasPerm(user, tenantObjId, perm)) return next();
    return res.status(403).json({ error: 'forbidden' });
  };
}

function requireAnyPerm(...perms) {
  return (req, res, next) => {
    const user = req.user;
    const tenantObjId = req.tenant;
    if (!user) return res.status(401).json({ error: 'unauthenticated' });
    if (isSysAdmin(user)) return next();
    if (isTenantAdminHere(user, tenantObjId)) return next();
    const ok = perms.some(p => userHasPerm(user, tenantObjId, p));
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
