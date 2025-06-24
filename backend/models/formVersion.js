const mongoose = require('mongoose');

const formVersionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  version: { type: Number, required: true },
  text: { type: String, required: true },
  valid: { type: Boolean, default: true },
  uploadedAt: { type: Date, default: Date.now },
});

formVersionSchema.index({ name: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('FormVersion', formVersionSchema);
