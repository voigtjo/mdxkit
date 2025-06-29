const mongoose = require('mongoose');

const formDataSchema = new mongoose.Schema({
  formName: { type: String, required: true },
  version: { type: Number, required: true },
  patientId: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  signature: { type: String }, // base64
  status: { type: String, enum: ['offen', 'gespeichert', 'freigegeben', 'angenommen'], default: 'offen' },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FormData', formDataSchema);
