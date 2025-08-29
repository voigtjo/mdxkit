// backend/models/user.js
const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    roles:   { type: [String], default: [] }, // Rollen-Keys aus Role-Collection (ohne Sys/TenantAdmin)
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // HINWEIS: Für reguläre Tenant-User bleibt tenantId Pflicht (tenantPlugin).
    // SystemAdmins werden NICHT über tenant-scope API verwaltet (separater Systembereich).
    tenantId: { type: String, required: true, index: true },

    displayName: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true },
    status: { type: String, enum: ['active','suspended','deleted'], default: 'active' },

    // Admin-Flags
    isSystemAdmin: { type: Boolean, default: false }, // nur via /api/sys/... setzbar
    isTenantAdmin: { type: Boolean, default: false }, // tenant-scope: ja, aber mit Regeln

    // Defaultgruppe (gehört zu memberships)
    defaultGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },

    // Mitgliedschaften mit rollenbezogener Zuweisung
    memberships: { type: [membershipSchema], default: [] },

    profile: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
