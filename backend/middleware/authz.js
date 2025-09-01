// backend/middleware/authz.js

const DEV_BYPASS = String(process.env.SKIP_AUTH).toLowerCase() === 'true';

const PERMS = {
  FORM_CREATE: 'form:create',
  FORM_PUBLISH: 'form:publish',           // freigeben/sperren
  FORM_ASSIGN: 'form:assign',             // Sichtbarkeit später
  FORM_ASSIGN_TEMPLATES: 'form:assign_templates',

  FORMDATA_EDIT: 'formdata:edit',
  FORMDATA_PUBLISH: 'formdata:publish',
};

const ROLE_PERMS = {
  Viewer: [],
  Operator: [PERMS.FORMDATA_EDIT],

  FormAuthor: [
    PERMS.FORM_CREATE,
    PERMS.FORM_ASSIGN_TEMPLATES,
  ],
  FormPublisher: [
    PERMS.FORM_PUBLISH,
  ],
  FormDataEditor:   [PERMS.FORMDATA_EDIT],
  FormDataApprover: [PERMS.FORMDATA_PUBLISH],

  Admin: [
    PERMS.FORM_CREATE,
    PERMS.FORM_PUBLISH,
    PERMS.FORM_ASSIGN,
    PERMS.FORM_ASSIGN_TEMPLATES,
    PERMS.FORMDATA_EDIT,
    PERMS.FORMDATA_PUBLISH,
  ],
};

function computeEffectivePerms(req) {
  const user = req.user || {};
  const tenantIdFromReq = req.tenantId || null;
  const isSystemAdmin = !!user.isSystemAdmin;
  const isTenantAdmin = !!user.isTenantAdmin;

  if (isSystemAdmin) {
    return { all: true, perms: new Set(Object.values(PERMS)) };
  }
  if (!user || !tenantIdFromReq) {
    return { all: false, perms: new Set() };
  }
  if (isTenantAdmin && user.tenantId && user.tenantId === tenantIdFromReq) {
    return { all: true, perms: new Set(Object.values(PERMS)) };
  }

  const memberships = Array.isArray(user.memberships) ? user.memberships : [];
  const selectedGroupId =
    req.selectedGroupId ||
    req.groupId ||
    req.params?.groupId ||
    user.defaultGroupId ||
    null;

  let roles = [];
  if (selectedGroupId) {
    const m = memberships.find((x) => String(x.groupId) === String(selectedGroupId));
    roles = Array.isArray(m?.roles) ? m.roles : [];
  } else {
    for (const m of memberships) {
      if (Array.isArray(m.roles)) roles.push(...m.roles);
    }
  }

  const perms = new Set();
  for (const role of roles) {
    const mapped = ROLE_PERMS[role] || [];
    mapped.forEach((p) => perms.add(p));
  }
  return { all: false, perms };
}

function requirePerm(...neededPerms) {
  return (req, res, next) => {
    if (DEV_BYPASS) return next();
    try {
      const eff = computeEffectivePerms(req);
      if (eff.all) return next();
      const ok = neededPerms.length === 0 || neededPerms.every((p) => eff.perms.has(p));
      if (!ok) {
        return res.status(403).json({ error: 'Forbidden', need: neededPerms, have: Array.from(eff.perms) });
      }
      next();
    } catch (err) { next(err); }
  };
}

/** NEU: mindestens eine der Permissions erforderlich */
function requireAnyPerm(...anyPerms) {
  return (req, res, next) => {
    if (DEV_BYPASS) return next();
    try {
      const eff = computeEffectivePerms(req);
      if (eff.all) return next();
      const ok = anyPerms.length === 0 || anyPerms.some((p) => eff.perms.has(p));
      if (!ok) {
        return res.status(403).json({ error: 'Forbidden', needAny: anyPerms, have: Array.from(eff.perms) });
      }
      next();
    } catch (err) { next(err); }
  };
}

/** Legacy (nicht für neue Routen benutzen) */
function requireRoles(...allowed) {
  return (req, res, next) => {
    if (DEV_BYPASS) return next();
    const roles = (req.user && Array.isArray(req.user.roles)) ? req.user.roles : [];
    const ok = allowed.length === 0 || allowed.some((r) => roles.includes(r));
    if (!ok) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

exports.PERMISSIONS = PERMS;
exports.requirePerm = requirePerm;
exports.requireAnyPerm = requireAnyPerm;
exports.requireRoles = requireRoles;
