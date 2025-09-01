// backend/models/user.js
const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    roles:   { type: [String], default: [] }, // Rollen-Keys (ohne Sys/TenantAdmin)
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // HINWEIS: Reguläre Tenant-User haben einen festen Tenant.
    // SystemAdmins werden NICHT über tenant-scope API verwaltet (separater /api/sys Bereich).
    tenantId: { type: String, required: true, index: true },

    displayName: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true, index: true },
    status: { type: String, enum: ['active','suspended','deleted'], default: 'active' },

    // Admin-Flags
    isSystemAdmin: { type: Boolean, default: false }, // nur via /api/sys/... setzbar
    isTenantAdmin: { type: Boolean, default: false }, // tenant-scope: ja, aber mit Regeln

    // Defaultgruppe (gehört zu memberships)
    defaultGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },

    // Mitgliedschaften mit rollenbezogener Zuweisung
    memberships: { type: [membershipSchema], default: [] },

    // Optional: lokale Auth (Passwort) – non-breaking, nur wenn du Login per PW nutzt
    passwordHash: { type: String, default: '' }, // bcrypt Hash (leer = kein lokales Passwort)
    tokenVersion: { type: Number, default: 0 }, // <— NEU

    // Optional: Security/MFA – vorbereitet, aber nicht zwingend genutzt
    mfa: {
      totpEnabled: { type: Boolean, default: false },
      totpSecret:  { type: String, default: '' },   // später verschlüsselt speichern
      webauthnCredentials: { type: Array, default: [] }, // Registrierungseinträge (späteres WebAuthn)
    },

    profile: { type: Object, default: {} },
  },
  { timestamps: true }
);
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
module.exports = mongoose.model('User', userSchema);
