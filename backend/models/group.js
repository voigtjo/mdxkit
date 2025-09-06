const mongoose = require('mongoose');
const withUid = require('../plugins/withUid');

const groupSchema = new mongoose.Schema(
  {
    // NEU: stabile Public-ID
    groupId: { type: String, unique: true, index: true },

    // NEU: Tenant als ObjectId-Ref (vorher: String)
    tenant:  { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

    key:   { type: String, required: true, trim: true },  // unique pro Tenant
    name:  { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active','suspended','deleted'], default: 'active' },

    // Primärer Gruppen-Admin (User-Ref innerhalb dieses Tenants)
    primaryAdminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Eindeutig pro Tenant
groupSchema.index({ tenant: 1, key: 1 }, { unique: true });

// Public-ID automatisch vergeben: grp_************
groupSchema.plugin(withUid({ field: 'groupId', prefix: 'grp_' }));

module.exports = mongoose.model('Group', groupSchema);
