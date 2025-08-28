const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

/**
 * Zukünftige, generische User (Patienten, Operator, Admins, ...)
 * Für Patienten reicht zunächst: displayName, email (optional), status.
 * memberships: später nutzbar für rollenbasierte Auth je Tenant.
 */
const membershipSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  roles: { type: [String], default: [] }, // z.B. ['FormDataEditor']
}, { _id: false });

const userSchema = new mongoose.Schema({
  displayName: { type: String, required: true },   // vormals patient.name
  email: { type: String, default: '' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },

  // spätere Auth (Hash) optional:
  passwordHash: { type: String },

  // Rollen je Tenant (für später):
  memberships: { type: [membershipSchema], default: [] },

  // Freie Felder für Profil/Medical:
  profile: { type: mongoose.Schema.Types.Mixed, default: {} },

  updatedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: true, updatedAt: true } });

userSchema.plugin(tenantPlugin);
userSchema.index({ tenantId: 1, status: 1, 'memberships.tenantId': 1 });

module.exports = mongoose.model('User', userSchema);
