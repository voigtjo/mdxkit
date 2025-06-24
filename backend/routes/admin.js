// routes/admin.js
const express = require('express');
const router = express.Router();

const Form = require('../models/form');
const FormVersion = require('../models/formVersion');

// Formular hochladen (neu oder neue Version)
router.post('/upload-form', async (req, res) => {
  const { name, text } = req.body;
  try {
    const latest = await FormVersion.find({ name }).sort({ version: -1 }).limit(1);
    const version = latest.length > 0 ? latest[0].version + 1 : 1;

    await FormVersion.updateMany({ name, valid: true }, { valid: false });

    const newVersion = new FormVersion({ name, version, text, valid: true });
    await newVersion.save();

    await Form.findOneAndUpdate(
      { name },
      { currentVersion: version },
      { upsert: true }
    );

    res.json({ success: true, version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Liste aller Formulare mit gültiger Version
router.get('/forms', async (req, res) => {
  try {
    const forms = await Form.find({});
    res.json(forms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;