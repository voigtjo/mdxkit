// backend/models/form.js
const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },

  // Technischer Formularname (pro Tenant)
  name: { type: String, required: true },

  // Versionierung (Index-Dokument)
  currentVersion: { type: Number, default: 1 },
  validVersion: { type: Number },

  // Refs auf FormVersion-Dokumente
  currentVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FormVersion' },
  validVersionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'FormVersion' },

  // (vorhandene, optional genutzte) Vorlagen-Refs
  formFormatId: { type: mongoose.Schema.Types.ObjectId, ref: 'FormFormat', default: null },
  formPrintId:  { type: mongoose.Schema.Types.ObjectId, ref: 'FormPrint',  default: null },

  updatedAt: { type: Date, default: Date.now },
}, {
  timestamps: false,
});

// Optional: Eindeutigkeit pro Tenant + Name
// formSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Form', formSchema);
