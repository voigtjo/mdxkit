const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const formVersionSchema = new mongoose.Schema({
  name: { type: String, required: true },     // Form-Name
  version: { type: Number, required: true },
  text: { type: String, required: true },
  valid: { type: Boolean, default: false },
}, { timestamps: true });

formVersionSchema.plugin(tenantPlugin);

// Eindeutig pro Tenant+Form+Version:
formVersionSchema.index({ tenantId: 1, name: 1, version: 1 }, { unique: true });

// Genau eine gültige Version pro Tenant+Form:
formVersionSchema.index(
  { tenantId: 1, name: 1, valid: 1 },
  { unique: true, partialFilterExpression: { valid: true } }
);

module.exports = mongoose.model('FormVersion', formVersionSchema);
