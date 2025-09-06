const mongoose = require('mongoose');
const withUid = require('../plugins/withUid');

const formTestdataSchema = new mongoose.Schema({
  // Public-ID des Testdatensatzes
  formTestdataId: { type: String, unique: true, index: true },

  // Tenant als ObjectId-Ref
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

  // Formular-Referenzen
  form:   { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true, index: true },
  formId: { type: String, index: true }, // Public-ID gespiegelt

  // Version (optional per Nummer oder per FormVersion)
  formVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'FormVersion', default: null, index: true },
  version:     { type: Number, required: true, index: true },

  // Inhalte
  data:      { type: mongoose.Schema.Types.Mixed },
  signature: { type: String },

  status: { type: String, enum: ['neu', 'gespeichert', 'freigegeben'], default: 'neu', index: true },
}, { timestamps: true });

// Eindeutig pro (tenant, form, version)
formTestdataSchema.index({ tenant: 1, form: 1, version: 1 }, { unique: true });
// Public-ID-Lookup
formTestdataSchema.index({ tenant: 1, formId: 1, version: 1 });

formTestdataSchema.plugin(withUid({ field: 'formTestdataId', prefix: 'ftst_' }));

formTestdataSchema.pre('save', async function (next) {
  try {
    if (!this.formId && this.form) {
      const Form = this.model('Form');
      const f = await Form.findById(this.form).select('formId').lean();
      if (f?.formId) this.formId = f.formId;
    }
    if (!this.version && this.formVersion) {
      const FV = this.model('FormVersion');
      const v = await FV.findById(this.formVersion).select('version').lean();
      if (v?.version != null) this.version = v.version;
    }
    next();
  } catch (e) { next(e); }
});

module.exports = mongoose.model('FormTestdata', formTestdataSchema);
