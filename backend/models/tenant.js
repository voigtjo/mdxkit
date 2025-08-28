const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true, index: true }, // z.B. "demo", "eurolab-01"
  name:     { type: String, required: true },                             // Anzeigename
  status:   { type: String, enum: ['active', 'suspended'], default: 'active', index: true },
  settings: { type: mongoose.Schema.Types.Mixed }, // optional: E‑Mail‑Absender, Branding, Limits, etc.
}, { timestamps: true });

module.exports = mongoose.model('Tenant', tenantSchema);
