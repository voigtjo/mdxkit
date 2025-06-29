// === BACKEND: models/formVersion.js ===
const mongoose = require('mongoose');
const formVersionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  version: { type: Number, required: true },
  text: { type: String, required: true },
  valid: { type: Boolean, default: false },
}, { timestamps: true }); // <== Das hinzufügen!


formVersionSchema.index({ name: 1, version: 1 }, { unique: true });
formVersionSchema.index({ name: 1, valid: 1 }, { unique: true, partialFilterExpression: { valid: true } });

module.exports = mongoose.model('FormVersion', formVersionSchema);