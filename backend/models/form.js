// models/form.js
const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  currentVersion: { type: Number, required: true },
  text: { type: String } // optional, zur Direktanzeige falls gewünscht
});

module.exports = mongoose.model('Form', formSchema);
