// routes/manage.js
const express = require('express');
const router = express.Router();

const { requirePerm, PERMISSIONS: P } = require('../middleware/authz');
const Form = require('../models/form');
const FormData = require('../models/formData');

router.post('/assign', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  const { formName, patientId } = req.body;
  const tenantId = req.tenantId;
  try {
    if (!formName || !patientId) {
      return res.status(400).json({ error: 'formName und patientId erforderlich' });
    }
    const form = await Form.findOne({ name: formName }).setOptions({ tenantId });
    if (!form) return res.status(404).json({ error: 'Formular nicht gefunden' });

    const entry = new FormData({
      tenantId, formName, version: form.currentVersion, patientId,
      status: 'offen', data: {}
    });
    await entry.save();
    res.json({ success: true, id: entry._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/accept/:id', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  const tenantId = req.tenantId;
  try {
    const entry = await FormData.findOne({ _id: req.params.id }).setOptions({ tenantId });
    if (!entry) return res.status(404).json({ error: 'Nicht gefunden' });
    if (entry.status !== 'freigegeben') {
      return res.status(409).json({ error: 'Nur freigegebene Formulare können akzeptiert werden' });
    }
    entry.status = 'angenommen';
    entry.updatedAt = new Date();
    await entry.save();
    res.json({ success: true, id: entry._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reopen/:id', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  const tenantId = req.tenantId;
  try {
    const entry = await FormData.findOne({ _id: req.params.id }).setOptions({ tenantId });
    if (!entry) return res.status(404).json({ error: 'Nicht gefunden' });
    if (entry.status !== 'freigegeben') {
      return res.status(409).json({ error: 'Nur freigegebene Formulare können erneut zugewiesen werden' });
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

router.get('/byForm/:formName', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
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

router.get('/byPatient/:patientId', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
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

router.delete('/assignment/:id', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  const tenantId = req.tenantId;
  try {
    const entry = await FormData.findOne({ _id: req.params.id }).setOptions({ tenantId });
    if (!entry) return res.status(404).json({ error: 'Nicht gefunden' });
    if (entry.status !== 'offen') {
      return res.status(409).json({ error: 'Nur offene Formulare können gelöscht werden' });
    }
    await entry.deleteOne();
    res.json({ success: true, deleted: entry._id });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
});

router.get('/allFormData', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  const tenantId = req.tenantId;
  try {
    const list = await FormData.find({}).setOptions({ tenantId }).sort({ updatedAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
