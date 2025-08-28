// routes/manage.js
const express = require('express');
const router = express.Router();

const Form = require('../models/form');
const FormData = require('../models/formData');

// Formular einem Patienten zuweisen (tenant-scope)
router.post('/assign', async (req, res) => {
  const { formName, patientId } = req.body;
  const tenantId = req.tenantId;

  try {
    if (!formName || !patientId) {
      return res.status(400).json({ error: 'formName und patientId erforderlich' });
    }

    const form = await Form.findOne({ name: formName }).setOptions({ tenantId });
    if (!form) return res.status(404).json({ error: 'Formular nicht gefunden' });

    const entry = new FormData({
      tenantId,
      formName,
      version: form.currentVersion,
      patientId,
      status: 'offen',
      data: {}
    });
    await entry.save();
    res.json({ success: true, id: entry._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Formular-Eintrag annehmen (nur von 'freigegeben' → 'angenommen')
router.post('/accept/:id', async (req, res) => {
  const tenantId = req.tenantId;
  try {
    const entry = await FormData.findOne({ _id: req.params.id }).setOptions({ tenantId });
    if (!entry) return res.status(404).json({ error: 'Nicht gefunden' });

    if (entry.status !== 'freigegeben') {
      return res
        .status(409)
        .json({ error: 'Nur freigegebene Formulare können akzeptiert werden' });
    }

    entry.status = 'angenommen';
    entry.updatedAt = new Date();
    await entry.save();
    res.json({ success: true, id: entry._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Formular erneut zuweisen (nur von 'freigegeben' → 'offen')
router.post('/reopen/:id', async (req, res) => {
  const tenantId = req.tenantId;
  try {
    const entry = await FormData.findOne({ _id: req.params.id }).setOptions({ tenantId });
    if (!entry) return res.status(404).json({ error: 'Nicht gefunden' });

    if (entry.status !== 'freigegeben') {
      return res
        .status(409)
        .json({ error: 'Nur freigegebene Formulare können erneut zugewiesen werden' });
    }

    entry.status = 'offen';
    entry.signature = null;
    entry.updatedAt = new Date();
    await entry.save();
    res.json({ success: true, id: entry._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Einträge nach Formular (tenant-scope)
router.get('/byForm/:formName', async (req, res) => {
  const tenantId = req.tenantId;
  try {
    const list = await FormData.find({ formName: req.params.formName })
      .setOptions({ tenantId })
      .sort({ updatedAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Einträge nach Patient (tenant-scope)
router.get('/byPatient/:patientId', async (req, res) => {
  const tenantId = req.tenantId;
  try {
    const list = await FormData.find({ patientId: req.params.patientId })
      .setOptions({ tenantId })
      .sort({ updatedAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Zuordnung löschen (nur wenn 'offen')
router.delete('/assignment/:id', async (req, res) => {
  const tenantId = req.tenantId;
  try {
    const entry = await FormData.findOne({ _id: req.params.id }).setOptions({ tenantId });
    if (!entry) return res.status(404).json({ error: 'Nicht gefunden' });

    if (entry.status !== 'offen') {
      return res
        .status(409)
        .json({ error: 'Nur offene Formulare können gelöscht werden' });
    }

    await entry.deleteOne();
    res.json({ success: true, deleted: entry._id });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

// Alle Formulardaten abrufen (nur aktueller Tenant)
router.get('/allFormData', async (req, res) => {
  const tenantId = req.tenantId;
  try {
    const list = await FormData.find({})
      .setOptions({ tenantId })
      .sort({ updatedAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
