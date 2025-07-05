const mongoose = require('mongoose');

const formPrintSchema = new mongoose.Schema({
  name: { type: String, required: true },
  text: { type: String, required: true },
  status: { type: String, enum: ['neu', 'freigegeben'], default: 'neu' },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FormPrint', formPrintSchema);
