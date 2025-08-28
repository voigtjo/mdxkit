const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const formFormatSchema = new mongoose.Schema({
  name: { type: String, required: true },
  text: { type: String, required: true },
  status: { type: String, enum: ['neu', 'freigegeben'], default: 'neu' },
  updatedAt: { type: Date, default: Date.now },
});

formFormatSchema.plugin(tenantPlugin);
formFormatSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('FormFormat', formFormatSchema);
