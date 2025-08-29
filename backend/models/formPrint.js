// backend/models/formPrint.js
const mongoose = require('mongoose');

const formPrintSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    name:     { type: String, required: true, trim: true },

    // Druckdefinition (z. B. HTML/Template)
    text: { type: String, default: '' },

    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true }
);

formPrintSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('FormPrint', formPrintSchema);
