const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const formDataSchema = new mongoose.Schema({
  formName: { type: String, required: true },
  version: { type: Number, required: true },
  patientId: { type: String, required: true }, // Optional: ref auf Patient._id (String vs ObjectId angleichen)
  data: { type: mongoose.Schema.Types.Mixed },
  signature: { type: String }, // base64
  status: { type: String, enum: ['offen', 'gespeichert', 'freigegeben', 'angenommen'], default: 'offen' },
  updatedAt: { type: Date, default: Date.now },
});

formDataSchema.plugin(tenantPlugin);

// Häufige Filter: Tenant + formName + patientId
formDataSchema.index({ tenantId: 1, formName: 1, patientId: 1 });

module.exports = mongoose.model('FormData', formDataSchema);
