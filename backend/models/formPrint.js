const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const formPrintSchema = new mongoose.Schema({
  name: { type: String, required: true },
  text: { type: String, required: true },
  status: { type: String, enum: ['neu', 'freigegeben'], default: 'neu' },
  updatedAt: { type: Date, default: Date.now },
});

formPrintSchema.plugin(tenantPlugin);
formPrintSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('FormPrint', formPrintSchema);
