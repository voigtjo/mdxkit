const mongoose = require('mongoose');

const formFormatSchema = new mongoose.Schema({
  name: { type: String, required: true },
  text: { type: String, required: true },
  status: { type: String, enum: ['neu', 'freigegeben'], default: 'neu' },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FormFormat', formFormatSchema);
