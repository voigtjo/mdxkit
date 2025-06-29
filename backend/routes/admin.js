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

    // Neue Version ist zunächst nicht gültig
    const newVersion = new FormVersion({ name, version, text, valid: false });
    await newVersion.save();

    const form = await Form.findOneAndUpdate(
      { name },
      {
        name,
        currentVersion: version,
        currentVersionId: newVersion._id,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, version });
  } catch (err) {
    console.error("❌ Fehler beim Hochladen des Formulars:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/forms/:name/release', async (req, res) => {
  const { name } = req.params;

  try {
    const form = await Form.findOne({ name }).populate('currentVersionId');
    if (!form || !form.currentVersionId) {
      return res.status(404).json({ error: 'Formular oder Version nicht gefunden' });
    }

    // Gültige Flags auf false setzen
    await FormVersion.updateMany({ name, valid: true }, { valid: false });

    // aktuelle Version freigeben
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



// Liste aller Formulare mit zugehöriger Version
router.get('/forms', async (req, res) => {
  try {
    const forms = await Form.find({})
      .populate('currentVersionId')
      .populate('validVersionId')
      .lean();

    const result = forms.map(f => ({
      name: f.name,
      currentVersion: f.currentVersionId?.version || null,
      validVersion: f.validVersionId?.version || null,
      status: f.validVersionId ? 'gültig' : 'neu',
      updatedAt: f.currentVersionId?.updatedAt || null,
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ Fehler beim Laden der Formulare:", err);
    res.status(500).json({ error: err.message });
  }
});



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

// Einzelne Version eines Formulars abrufen
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



module.exports = router;