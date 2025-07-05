// models/formTestdata.js
const mongoose = require('mongoose');

const formTestdataSchema = new mongoose.Schema({
  formName: { type: String, required: true },
  version: { type: Number, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  signature: { type: String }, // base64
  status: { type: String, enum: ['neu', 'gespeichert', 'freigegeben'], default: 'neu' },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FormTestdata', formTestdataSchema);
