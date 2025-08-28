const mongoose = require('mongoose');
const tenantPlugin = require('../plugins/tenantPlugin');

const formSchema = new mongoose.Schema({
  name: { type: String, required: true }, // nicht global unique!
  currentVersion: { type: Number, default: 1 },
  validVersion: { type: Number },
  currentVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FormVersion' },
  validVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FormVersion' },
  updatedAt: { type: Date, default: Date.now },
  formFormatId: { type: mongoose.Schema.Types.ObjectId, ref: 'FormFormat' },
  formPrintId: { type: mongoose.Schema.Types.ObjectId, ref: 'FormPrint' },
});

formSchema.plugin(tenantPlugin);

// Form-Name muss pro Tenant eindeutig sein:
formSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Form', formSchema);
