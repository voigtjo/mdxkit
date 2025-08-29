// backend/models/formVersion.js
const mongoose = require('mongoose');

const formVersionSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, index: true },

    // (optional) Rücklink auf den Form-Index
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', default: null },

    // Identifikation
    name: { type: String, required: true, trim: true, index: true },
    version: { type: Number, required: true, index: true },

    // Inhalt
    text: { type: String, required: true },

    // 🔴 Sichtbarkeit auf der Version (dein Wunsch)
    isGlobal: { type: Boolean, default: true },
    groupIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],

    // ggf. Flags
    locked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Eindeutig pro Tenant + Name + Version
formVersionSchema.index({ tenantId: 1, name: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('FormVersion', formVersionSchema);
