const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String }, // optional
});

module.exports = mongoose.model('Patient', patientSchema);
