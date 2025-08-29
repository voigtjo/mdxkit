// backend/models/formFormat.js
const mongoose = require('mongoose');

const formFormatSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },
    name:     { type: String, required: true, trim: true },

    // Inhalt/Template (Text/JSON – passe bei Bedarf an)
    text: { type: String, default: '' },

    status: { type: String, enum: ['active', 'archived'], default: 'active' },

    // Optional Versionierung analog zu Form (nur falls du das nutzen willst)
    currentVersion:   { type: Number, default: 1 },
    currentVersionId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

formFormatSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('FormFormat', formFormatSchema);
