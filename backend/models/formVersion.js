// backend/models/formVersion.js
const mongoose = require('mongoose');
const withUid = require('../plugins/withUid');

const formVersionSchema = new mongoose.Schema({
  // Public-ID
  formVersionId: { type: String, unique: true, index: true },

  // Tenant (ObjId) und Form-Referenz (ObjId)
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  form:   { type: mongoose.Schema.Types.ObjectId, ref: 'Form',   required: true, index: true },

  // Optional: Kopie der Form-Public-ID für schnelle Lookups ohne Populate
  formId: { type: String, index: true },

  // Identifikation
  name:    { type: String, required: true, trim: true, index: true }, // entspricht Form.name
  version: { type: Number, required: true, index: true },

  // Inhalt
  text: { type: String, required: true },

  // Sichtbarkeit/Scope
  isGlobal: { type: Boolean, default: true },
  groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],

  // Flags
  locked: { type: Boolean, default: false },
}, { timestamps: true });

// Eindeutig: pro Form eine Version nur einmal
formVersionSchema.index({ form: 1, version: 1 }, { unique: true });

// (Optional ergänzend – falls du häufig per tenant+name+version suchst)
// formVersionSchema.index({ tenant: 1, name: 1, version: 1 }, { unique: true });

formVersionSchema.plugin(withUid({ field: 'formVersionId', prefix: 'fver_' }));

// Beim Speichern formId (Public) aus dem Form-Dokument spiegeln (wenn nicht gesetzt)
formVersionSchema.pre('save', async function (next) {
  try {
    if (!this.formId && this.form) {
      const Form = this.model('Form');
      const f = await Form.findById(this.form).select('formId').lean();
      if (f?.formId) this.formId = f.formId;
    }
    next();
  } catch (e) { next(e); }
});

module.exports = mongoose.model('FormVersion', formVersionSchema);
