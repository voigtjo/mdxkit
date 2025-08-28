// routes/form.js
const express = require('express');
const router = express.Router();

const Form = require('../models/form');
const FormVersion = require('../models/formVersion');
const FormData = require('../models/formData');
const FormTestData = require('../models/formTestdata');

// --- Helpers wie gehabt (unverändert gegenüber deiner Version) ---
async function getFormWithEntry({ formName, patientId = null, isTest = false, tenantId }) {
  const DataModel = isTest ? FormTestData : FormData;
  let entry;

  if (isTest) {
    const formMeta = await Form.findOne({ name: formName })
      .setOptions({ tenantId })
      .populate('currentVersionId')
      .populate('formFormatId');
    if (!formMeta || !formMeta.currentVersionId) throw new Error('Formular nicht gefunden');

    const version = formMeta.currentVersion;
    const versionText = formMeta.currentVersionId.text;
    const formatText = formMeta.formFormatId?.text || "";

    entry = await DataModel.findOne({ formName, version }).setOptions({ tenantId });
    if (!entry) {
      entry = await DataModel.create({
        tenantId, formName, version, data: {}, status: 'neu', updatedAt: new Date()
      });
    }
    return { text: versionText, format: formatText, data: entry };
  } else {
    entry = await DataModel.findOne({ formName, patientId }).setOptions({ tenantId });
    if (!entry) throw new Error('Zuweisung nicht gefunden');

    const versionDoc = await FormVersion.findOne({ name: formName, version: entry.version })
      .setOptions({ tenantId });
    if (!versionDoc) throw new Error('Formularversion nicht gefunden');

    const form = await Form.findOne({ name: formName })
      .setOptions({ tenantId }).populate('formFormatId');
    const formatText = form?.formFormatId?.text || "";

    return { text: versionDoc.text, format: formatText, data: entry };
  }
}

// Speichern – blockiert, wenn 'angenommen'
async function saveFormEntry({ id, data, signature, isTest = false, tenantId }) {
  const Model = isTest ? FormTestData : FormData;
  if (!isTest) {
    const current = await Model.findOne({ _id: id }).setOptions({ tenantId });
    if (!current) throw new Error('Eintrag nicht gefunden');
    if (current.status === 'angenommen') {
      const err = new Error('Formular ist abgeschlossen und kann nicht mehr verändert werden');
      err.status = 409; throw err;
    }
  }
  const update = { data, ...(signature ? { signature } : {}), status: 'gespeichert', updatedAt: new Date() };
  const updated = await Model.findOneAndUpdate({ _id: id }, update, { new: true }).setOptions({ tenantId });
  if (!updated) throw new Error('Eintrag nicht gefunden');
  return updated;
}

// Submit – blockiert, wenn 'angenommen'
async function submitFormEntry({ id, data, signature, isTest = false, tenantId }) {
  const Model = isTest ? FormTestData : FormData;
  const entry = await Model.findOne({ _id: id }).setOptions({ tenantId });
  if (!entry) throw new Error('Eintrag nicht gefunden');
  if (!isTest && entry.status === 'angenommen') {
    const err = new Error('Formular ist abgeschlossen und kann nicht mehr freigegeben werden');
    err.status = 409; throw err;
  }
  entry.data = data;
  entry.signature = signature;
  entry.status = 'freigegeben';
  entry.updatedAt = new Date();
  await entry.save();
  return entry;
}

// --- Routes (ohne doppelten 'form'-Prefix) ---
// Produktivformular laden
router.get('/:formName/:patientId', async (req, res) => {
  try {
    const { formName, patientId } = req.params;
    const tenantId = req.tenantId;
    const result = await getFormWithEntry({ formName, patientId, isTest: false, tenantId });
    res.json(result);
  } catch (err) {
    console.error('❌ Fehler bei GET /:formName/:patientId:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Testformular laden/erstellen
router.get('/test/:formName', async (req, res) => {
  try {
    const { formName } = req.params;
    const tenantId = req.tenantId;
    const result = await getFormWithEntry({ formName, isTest: true, tenantId });
    res.json({ ...result, mode: 'TEST' });
  } catch (err) {
    console.error('❌ Fehler bei GET /test/:formName:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Speichern (PROD/TEST)
router.put('/save/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, signature } = req.body;
    const tenantId = req.tenantId;
    const updated = await saveFormEntry({ id, data, signature, isTest: false, tenantId });
    res.json(updated);
  } catch (err) {
    console.error('❌ Fehler bei PUT /save/:id:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.put('/save-test/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, signature } = req.body;
    const tenantId = req.tenantId;
    const updated = await saveFormEntry({ id, data, signature, isTest: true, tenantId });
    res.json(updated);
  } catch (err) {
    console.error('❌ Fehler bei PUT /save-test/:id:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Submit (PROD/TEST)
router.post('/submit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, signature } = req.body;
    const tenantId = req.tenantId;
    await submitFormEntry({ id, data, signature, isTest: false, tenantId });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Fehler bei POST /submit/:id:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/submit-test/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, signature } = req.body;
    const tenantId = req.tenantId;
    await submitFormEntry({ id, data, signature, isTest: true, tenantId });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Fehler bei POST /submit-test/:id:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
