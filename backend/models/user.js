const mongoose = require('mongoose');
const withUid = require('../plugins/withUid');

const membershipSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    roles:   { type: [String], default: [] }, // Rollen-Keys (ohne Sys/TenantAdmin)
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // NEU: stabile, servergenerierte Public-ID
    userId: { type: String, unique: true, index: true },

    // NEU: Tenant als ObjectId-Referenz (vorher: String)
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    displayName: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true, lowercase: true, index: true },
    status: { type: String, enum: ['active','suspended','deleted'], default: 'active' },

    // Admin-Flags
    isSystemAdmin: { type: Boolean, default: false }, // nur via /api/sys/... setzbar
    isTenantAdmin: { type: Boolean, default: false }, // tenant-scope: ja, aber mit Regeln

    // Defaultgruppe (gehört zu memberships)
    defaultGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },

    // Mitgliedschaften mit rollenbezogener Zuweisung
    memberships: { type: [membershipSchema], default: [] },

    // Lokale Auth (falls genutzt)
    passwordHash: { type: String, default: '' }, // bcrypt Hash (leer = kein lokales Passwort)
    tokenVersion: { type: Number, default: 0 },

    // Security/MFA (optional)
    mfa: {
      totpEnabled: { type: Boolean, default: false },
      totpSecret:  { type: String, default: '' },
      webauthnCredentials: { type: Array, default: [] },
    },

    profile: { type: Object, default: {} },
  },
  { timestamps: true }
);

// pro Tenant darf eine E-Mail nur einmal vorkommen
userSchema.index({ tenant: 1, email: 1 }, { unique: true, sparse: true });

// Public-ID automatisch vergeben: usr_************
userSchema.plugin(withUid({ field: 'userId', prefix: 'usr_' }));

module.exports = mongoose.model('User', userSchema);
