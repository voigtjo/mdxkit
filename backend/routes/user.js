// routes/user.js
const express = require('express');
const router = express.Router();

const Form = require('../models/form');
const FormVersion = require('../models/formVersion');
const FormData = require('../models/formData');

// Formular anzeigen für Eingabe
router.get('/form/:formName/:patientId', async (req, res) => {
  try {
    const { formName, patientId } = req.params;
    const form = await Form.findOne({ name: formName });
    if (!form) return res.status(404).json({ error: 'Formular nicht gefunden' });

    const version = await FormVersion.findOne({ name: formName, version: form.currentVersion });
    const entry = await FormData.findOne({ formName, patientId, version: form.currentVersion });
    if (!entry) return res.status(404).json({ error: 'Zuweisung nicht gefunden' });

    res.json({ text: version.text, data: entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// routes/user.js
router.put('/save/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data } = req.body;

    const updated = await FormData.findByIdAndUpdate(
      id,
      { data, status: 'gespeichert' },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Eintrag nicht gefunden' });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Formular abschicken
router.post('/submit/:id', async (req, res) => {
  try {
    const { data, signature } = req.body;
    const entry = await FormData.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Eintrag nicht gefunden' });

    entry.data = data;
    entry.signature = signature;
    entry.status = 'ausgefüllt';
    entry.updatedAt = new Date();
    await entry.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;