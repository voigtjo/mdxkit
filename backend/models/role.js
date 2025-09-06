const mongoose = require('mongoose');
const withUid = require('../plugins/withUid');

/**
 * Systemweite Rollen-Definitionen (keine Tenant-Bindung).
 * 'SystemAdmin' und 'TenantAdmin' bleiben Booleans am User.
 */
const roleSchema = new mongoose.Schema(
  {
    // NEU: stabile Public-ID
    roleId:     { type: String, unique: true, index: true },

    key:        { type: String, required: true, unique: true, trim: true },
    name:       { type: String, required: true, trim: true },
    description:{ type: String, default: '' },
    status:     { type: String, enum: ['active','suspended','deleted'], default: 'active' },
  },
  { timestamps: true }
);

// Public-ID automatisch vergeben: rol_************
roleSchema.plugin(withUid({ field: 'roleId', prefix: 'rol_' }));

module.exports = mongoose.model('Role', roleSchema);
