const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const formTestdataSchema = new mongoose.Schema({
  formName: { type: String, required: true },
  version: { type: Number, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  signature: { type: String },
  status: { type: String, enum: ['neu', 'gespeichert', 'freigegeben'], default: 'neu' },
  updatedAt: { type: Date, default: Date.now },
});

formTestdataSchema.plugin(tenantPlugin);
formTestdataSchema.index({ tenantId: 1, formName: 1, version: 1 });

module.exports = mongoose.model('FormTestdata', formTestdataSchema);
