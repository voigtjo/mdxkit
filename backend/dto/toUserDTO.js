// backend/dto/toUserDTO.js
module.exports = function toUserDTO(userDoc, opts = {}) {
  if (!userDoc) return null;

  const { groups = null } = opts; // optional: Array von Group-Dokumenten (oder Plain Objects)
  const u = typeof userDoc.toObject === 'function' ? userDoc.toObject() : userDoc;
  const t = u.tenant && typeof u.tenant === 'object' ? u.tenant : null;

  const dto = {
    _id: String(u._id),
    email: u.email,
    displayName: u.displayName || null,

    isSystemAdmin: !!u.isSystemAdmin,
    isTenantAdmin: !!u.isTenantAdmin,

    // flache Public-TenantId, die der FE immer braucht
    tenantId: t?.tenantId || null,

    // optionale “nice to have”-Infos zum Tenant
    tenant: t ? { id: String(t._id), tenantId: t.tenantId, name: t.name || null } : null,

    // Mitgliedschaften mit Rollen (wie im Schema)
    memberships: Array.isArray(u.memberships)
      ? u.memberships.map(m => ({
          groupId: String(m.groupId),
          roles: Array.isArray(m.roles) ? m.roles : [],
        }))
      : [],

    // Default-Gruppe (falls gesetzt)
    defaultGroupId: u.defaultGroupId ? String(u.defaultGroupId) : null,
  };

  // Wenn Gruppen mitgeliefert werden, hängen wir eine schlanke Liste an
  if (Array.isArray(groups)) {
    dto.groups = groups.map(g => ({
      id: String(g._id),
      groupId: g.groupId,       // öffentliche ID (grp_****)
      key: g.key,
      name: g.name,
      status: g.status,
    }));
  }

  return dto;
};
