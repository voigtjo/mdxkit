// === BACKEND: models/form.js ===
const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  currentVersion: { type: Number, default: 1 },
  validVersion: { type: Number },
  currentVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FormVersion' },
  validVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FormVersion' },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Form', formSchema);