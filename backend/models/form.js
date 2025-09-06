// backend/models/form.js
const mongoose = require('mongoose');
const withUid = require('../plugins/withUid');

const formSchema = new mongoose.Schema({
  // Public-ID für schöne/ stabile URLs
  formId: { type: String, unique: true, index: true },

  // Tenant als ObjectId-Ref (Best Practice)
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

  // Technischer Formularname (pro Tenant eindeutig)
  name: { type: String, required: true, trim: true },

  // Versionierung (Index-Dokument)
  currentVersion: { type: Number, default: 1 },
  validVersion:   { type: Number },

  // Referenzen auf FormVersion-Dokumente
  currentVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FormVersion', default: null },
  validVersionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'FormVersion', default: null },
}, { timestamps: true });

// Eindeutigkeit pro Tenant + Name
formSchema.index({ tenant: 1, name: 1 }, { unique: true });

// Public-ID automatisch vergeben (z. B. frm_ab12cd34ef56)
formSchema.plugin(withUid({ field: 'formId', prefix: 'frm_' }));

module.exports = mongoose.model('Form', formSchema);
