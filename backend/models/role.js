// backend/models/role.js
const mongoose = require('mongoose');

/**
 * Systemweite Rollen-Definitionen (keine Tenant-Bindung).
 * WICHTIG: 'SystemAdmin' und 'TenantAdmin' gehören NICHT hierher
 * (das sind Booleans am User).
 *
 * Beispieleinträge:
 * { key: 'FormAuthor',      name: 'Form Author',      description: 'Darf Formulare anlegen/bearbeiten' }
 * { key: 'FormPublisher',   name: 'Form Publisher',   description: 'Darf Formulare veröffentlichen' }
 * { key: 'Operator',        name: 'Operator',         description: 'Bedient Forms/Workflows' }
 * { key: 'FormDataEditor',  name: 'Form Data Editor', description: 'Daten erfassen/bearbeiten' }
 * { key: 'FormDataApprover',name: 'Form Data Approver', description: 'Freigaben erteilen' }
 */
const roleSchema = new mongoose.Schema(
  {
    key:        { type: String, required: true, unique: true, trim: true, lowercase: false },
    name:       { type: String, required: true, trim: true },
    description:{ type: String, default: '' },
    status:     { type: String, enum: ['active','suspended','deleted'], default: 'active' },
  },
  { timestamps: true }
);

roleSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);
