// routes/manage.js
const express = require('express');
const router = express.Router();

const Form = require('../models/form');
const FormData = require('../models/formData');

// Formular einem Patienten zuweisen
router.post('/assign', async (req, res) => {
  const { formName, patientId } = req.body;
  try {
    const form = await Form.findOne({ name: formName });
    if (!form) return res.status(404).json({ error: 'Formular nicht gefunden' });

    const entry = new FormData({
      formName,
      version: form.currentVersion,
      patientId,
      status: 'offen',
      data: {}
    });
    await entry.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Formular-Eintrag annehmen
router.post('/accept/:id', async (req, res) => {
  try {
    const entry = await FormData.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Nicht gefunden' });

    entry.status = 'angenommen';
    entry.updatedAt = new Date();
    await entry.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Formular erneut freigeben
router.post('/reopen/:id', async (req, res) => {
  try {
    const entry = await FormData.findById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Nicht gefunden' });

    entry.status = 'offen';
    entry.signature = null;
    entry.updatedAt = new Date();
    await entry.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Einträge nach Formular
router.get('/byForm/:formName', async (req, res) => {
  try {
    const list = await FormData.find({ formName: req.params.formName }).sort({ updatedAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Einträge nach Patient
router.get('/byPatient/:patientId', async (req, res) => {
  try {
    const list = await FormData.find({ patientId: req.params.patientId }).sort({ updatedAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.delete('/assignment/:id', async (req, res) => {
  try {
    const result = await FormData.findByIdAndDelete(req.params.id);
    res.json({ success: true, deleted: result });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});


module.exports = router;