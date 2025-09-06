// backend/models/tenant.js
const mongoose = require('mongoose');
const withUid = require('../plugins/withUid');

const tenantSchema = new mongoose.Schema(
  {
    // sprechender Schlüssel darf bleiben (z. B. 'dev'), aber ist NICHT mehr primär
    key:    { type: String, required: true, unique: true, trim: true },
    name:   { type: String, required: true, trim: true },
    status: { type: String, enum: ['active','suspended','deleted'], default: 'active' },

    // NEU: stabile, servergenerierte Public-ID
    tenantId: { type: String, unique: true, index: true },

    // primärer TenantAdmin (ObjectId-Ref)
    primaryAdminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// KEIN zusätzlicher index({key:1}) mehr – field.unique reicht.
// UID-Plugin: schreibt in tenantId (z. B. "ten_ab12cd34ef56")
tenantSchema.plugin(withUid({ field: 'tenantId', prefix: 'ten_' }));

module.exports = mongoose.model('Tenant', tenantSchema);
