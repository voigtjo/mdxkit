const mongoose = require('mongoose');
const withUid = require('../plugins/withUid');

const formDataSchema = new mongoose.Schema({
  // Public-ID des Datensatzes
  formDataId: { type: String, unique: true, index: true },

  // Tenant als ObjectId-Ref
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },

  // Formular-Referenzen
  form:   { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true, index: true },
  formId: { type: String, index: true }, // Public-ID (gespiegelt)

  // Version (entweder direkt per Nummer oder per FormVersion)
  formVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'FormVersion', default: null, index: true },
  version:     { type: Number, index: true },

  // 🔁 patient → user
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userId: { type: String, index: true }, // Public-ID (gespiegelt)

  // Inhalte
  data:      { type: mongoose.Schema.Types.Mixed },
  signature: { type: String }, // base64

  // Status
  status: { type: String, enum: ['offen', 'gespeichert', 'freigegeben', 'angenommen'], default: 'offen', index: true },
}, { timestamps: true });

// Eindeutig pro (tenant, form, user, version) – nur wenn version gesetzt ist
formDataSchema.index({ tenant: 1, form: 1, user: 1, version: 1 }, { unique: true, sparse: true });
// Schneller Lookup über Public-IDs
formDataSchema.index({ tenant: 1, formId: 1, userId: 1, version: 1 }, { sparse: true });

formDataSchema.plugin(withUid({ field: 'formDataId', prefix: 'fdat_' }));

// Spiegel-Felder (Public-IDs/Version) beim Speichern automatisch auffüllen
formDataSchema.pre('save', async function (next) {
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
    if (!this.userId && this.user) {
      const User = this.model('User');
      const u = await User.findById(this.user).select('userId').lean();
      if (u?.userId) this.userId = u.userId;
    }
    next();
  } catch (e) { next(e); }
});

module.exports = mongoose.model('FormData', formDataSchema);
