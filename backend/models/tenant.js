// backend/models/tenant.js
const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active','suspended','deleted'], default: 'active' },

    // NEU: primärer TenantAdmin (UserId), wird von SystemAdmin beim Anlegen gesetzt.
    primaryAdminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

tenantSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.model('Tenant', tenantSchema);
