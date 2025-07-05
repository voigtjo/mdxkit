const express = require('express');
const router = express.Router();

const Form = require('../models/form');
const FormVersion = require('../models/formVersion');

// Formular hochladen oder aktualisieren
router.post('/upload-form', async (req, res) => {
  const { name, text } = req.body;
  try {
    const latest = await FormVersion.find({ name }).sort({ version: -1 }).limit(1);
    let version;
    let newVersion;
    let mode;

    if (latest.length > 0 && !latest[0].valid) {
      latest[0].text = text;
      await latest[0].save();
      version = latest[0].version;
      mode = 'update';
    } else {
      version = latest.length > 0 ? latest[0].version + 1 : 1;
      newVersion = new FormVersion({ name, version, text, valid: false });
      await newVersion.save();
      mode = 'new';
    }

    const form = await Form.findOneAndUpdate(
      { name },
      {
        name,
        currentVersion: version,
        currentVersionId: newVersion?._id || latest[0]._id,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, version, mode });
  } catch (err) {
    console.error("❌ Fehler beim Hochladen des Formulars:", err);
    res.status(500).json({ error: err.message });
  }
});

// Formularversion freigeben
router.post('/forms/:name/release', async (req, res) => {
  const { name } = req.params;

  try {
    const form = await Form.findOne({ name }).populate('currentVersionId');
    if (!form || !form.currentVersionId) {
      return res.status(404).json({ error: 'Formular oder Version nicht gefunden' });
    }

    await FormVersion.updateMany({ name, valid: true }, { valid: false });

    form.currentVersionId.valid = true;
    await form.currentVersionId.save();

    form.validVersion = form.currentVersion;
    form.validVersionId = form.currentVersionId._id;
    await form.save();

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Fehler beim Freigeben:", err);
    res.status(500).json({ error: err.message });
  }
});

// Liste aller Formulare mit Version + Vorlagen
router.get('/forms', async (req, res) => {
  try {
    const forms = await Form.find({})
      .populate('currentVersionId')
      .populate('validVersionId')
      .populate('formFormatId') // 🆕 Formatvorlage
      .populate('formPrintId')  // 🆕 Printvorlage
      .lean();

    const result = forms.map(f => ({
      name: f.name,
      currentVersion: f.currentVersionId?.version || null,
      validVersion: f.validVersionId?.version || null,
      status: f.validVersionId ? 'gültig' : 'neu',
      updatedAt: f.currentVersionId?.updatedAt || null,
      format: f.formFormatId?.name || null,
      print: f.formPrintId?.name || null,
      formFormatId: f.formFormatId?._id || null,
      formPrintId: f.formPrintId?._id || null,
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ Fehler beim Laden der Formulare:", err);
    res.status(500).json({ error: err.message });
  }
});

// Formularversion abrufen
router.get('/forms/:name/version/:version', async (req, res) => {
  const { name, version } = req.params;
  try {
    const form = await FormVersion.findOne({ name, version: parseInt(version) });
    if (!form) return res.status(404).json({ error: 'Formularversion nicht gefunden' });
    res.json(form);
  } catch (err) {
    console.error("❌ Fehler beim Abrufen einer Formularversion:", err);
    res.status(500).json({ error: err.message });
  }
});

// Formular sperren
router.post('/forms/:name/lock', async (req, res) => {
  const { name } = req.params;
  const { version } = req.body;

  try {
    const form = await Form.findOne({ name });
    if (!form) return res.status(404).json({ error: 'Formular nicht gefunden' });

    const ver = form.versions.find((v) => v.version === version);
    if (!ver) return res.status(404).json({ error: 'Version nicht gefunden' });

    ver.status = 'gesperrt';
    await form.save();

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Fehler beim Sperren:", err);
    res.status(500).json({ error: err.message });
  }
});

// Format-/Printvorlage zuweisen
router.put('/forms/:name/assign-templates', async (req, res) => {
  const { name } = req.params;
  const { formFormatId, formPrintId } = req.body;

  try {
    const form = await Form.findOne({ name });
    if (!form) return res.status(404).json({ error: 'Formular nicht gefunden' });

    if (formFormatId !== undefined) form.formFormatId = formFormatId;
    if (formPrintId !== undefined) form.formPrintId = formPrintId;

    await form.save();
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Fehler beim Zuweisen der Vorlagen:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
