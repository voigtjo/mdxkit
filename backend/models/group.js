// backend/models/group.js
const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    key: { type: String, required: true, trim: true },          // unique per tenant
    name: { type: String, required: true, trim: true },         // display name
    description: { type: String, default: '' },
    status: { type: String, enum: ['active','suspended','deleted'], default: 'active' },

    // Primärer Gruppen-Admin (UserId innerhalb dieses Tenants)
    primaryAdminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Eindeutig pro Tenant
groupSchema.index({ tenantId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Group', groupSchema);
