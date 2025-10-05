// backend/dto/toUserDTO.js
module.exports = function toUserDTO(userDoc, { groups = [] } = {}) {
  if (!userDoc) return null;

  // robust gegen Mongoose-Dokumente
  const u = typeof userDoc.toObject === 'function' ? userDoc.toObject() : userDoc;
  const t = u.tenant && typeof u.tenant === 'object' ? u.tenant : null;

  // Mitgliedschaften: groupId (ObjectId) + Rollen
  const memberships = Array.isArray(u.memberships)
    ? u.memberships.map(m => ({
        groupId: String(m.groupId),                 // <- ObjectId als String
        roles: Array.isArray(m.roles) ? m.roles : []
      }))
    : [];

  // Gruppenliste (vom Aufrufer mitgegeben)
  const groupsList = Array.isArray(groups)
    ? groups.map(g => ({
        id: String(g._id),                          // <- ObjectId
        groupId: g.groupId || null,                 // <- öffentliche grp_… ID (falls vorhanden)
        key: g.key || null,
        name: g.name || null,
        status: g.status || null,
      }))
    : [];

  // optionales Preview + Counts (praktisch fürs Debug)
  const groupsPreview = groupsList.map(g => ({
    id: g.id, groupId: g.groupId, key: g.key, name: g.name, status: g.status
  }));

  return {
    // Basis
    id: String(u._id),
    email: u.email,
    displayName: u.displayName || null,

    // Admin-Flags
    isSystemAdmin: !!u.isSystemAdmin,
    isTenantAdmin: !!u.isTenantAdmin,

    // Tenant (flattened + optional Objekt)
    tenantId: t?.tenantId || null,
    tenant: t ? { id: String(t._id), tenantId: t.tenantId, name: t.name || null } : null,

    // Default-Gruppe (ObjectId als String)
    defaultGroupId: u.defaultGroupId ? String(u.defaultGroupId) : null,

    // WICHTIG: die eigentlichen Mitgliedschaften + Rollen
    memberships,

    // komplette Gruppenliste dieses Tenants
    groups: groupsList,

    // Debug/Convenience
    membershipsCount: memberships.length,
    groupsCount: groupsList.length,
    groupsPreview
  };
};
