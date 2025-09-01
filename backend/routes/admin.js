// backend/routes/admin.js
const express = require('express');
const router = express.Router();

const { requirePerm, requireAnyPerm, PERMISSIONS: P } = require('../middleware/authz');
const Form = require('../models/form');
const FormVersion = require('../models/formVersion');

// Formular hochladen oder aktualisieren (nur Author/Admin)
router.post('/upload-form', requirePerm(P.FORM_CREATE), async (req, res) => {
  const { name, text } = req.body;
  const tenantId = req.tenantId;

  try {
    const latest = await FormVersion.find({ name }).setOptions({ tenantId }).sort({ version: -1 }).limit(1);

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
      newVersion = new FormVersion({ tenantId, name, version, text, valid: false });
      await newVersion.save();
      mode = 'new';
    }

    const currentVersionId = newVersion?._id || latest[0]?._id || null;

    const form = await Form.findOneAndUpdate(
      { name },
      {
        $set: {
          name,
          currentVersion: version,
          currentVersionId: currentVersionId,
          updatedAt: new Date(),
        },
        $setOnInsert: { tenantId },
      },
      { upsert: true, new: true }
    ).setOptions({ tenantId });

    res.json({ success: true, version, mode });
  } catch (err) {
    console.error('❌ upload-form:', err);
    res.status(500).json({ error: err.message });
  }
});

// Formularversion freigeben (Publisher/Admin)
router.post('/forms/:name/release', requirePerm(P.FORM_PUBLISH), async (req, res) => {
  const { name } = req.params;
  const tenantId = req.tenantId;

  try {
    const form = await Form.findOne({ name }).setOptions({ tenantId }).populate('currentVersionId');
    if (!form || !form.currentVersionId) {
      return res.status(404).json({ error: 'Formular oder Version nicht gefunden' });
    }

    await FormVersion.updateMany({ name, valid: true }).setOptions({ tenantId }).updateMany({}, { valid: false });

    form.currentVersionId.valid = true;
    await form.currentVersionId.save();

    form.validVersion = form.currentVersion;
    form.validVersionId = form.currentVersionId._id;
    await form.save();

    res.json({ success: true });
  } catch (err) {
    console.error('❌ forms/:name/release:', err);
    res.status(500).json({ error: err.message });
  }
});

// Liste aller Formulare (Author ODER Publisher ODER Admin)
router.get('/forms', requireAnyPerm(P.FORM_CREATE, P.FORM_PUBLISH), async (req, res) => {
  const tenantId = req.tenantId;
  try {
    const forms = await Form.find({})
      .setOptions({ tenantId })
      .populate('currentVersionId')
      .populate('validVersionId')
      .populate('formFormatId')
      .populate('formPrintId')
      .lean();

    const result = forms.map((f) => ({
      _id: String(f._id),
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
    console.error('❌ get /forms:', err);
    res.status(500).json({ error: err.message });
  }
});

// Formularversion abrufen (Author ODER Publisher)
router.get('/forms/:name/version/:version', requireAnyPerm(P.FORM_CREATE, P.FORM_PUBLISH), async (req, res) => {
  const { name, version } = req.params;
  try {
    const form = await FormVersion.findOne({ name, version: parseInt(version, 10) })
      .setOptions({ tenantId: req.tenantId });
    if (!form) return res.status(404).json({ error: 'Formularversion nicht gefunden' });
    res.json(form);
  } catch (err) {
    console.error('❌ get version:', err);
    res.status(500).json({ error: err.message });
  }
});

// Formular sperren (nur Admin/Publisher)
router.post('/forms/:name/lock', requirePerm(P.FORM_PUBLISH), async (req, res) => {
  const { name } = req.params;
  const { version } = req.body;
  const tenantId = req.tenantId;

  try {
    if (typeof version !== 'number') {
      return res.status(400).json({ error: 'version (Number) erforderlich' });
    }

    const base = await Form.findOne({ name }).setOptions({ tenantId });
    if (!base) return res.status(404).json({ error: 'Formular nicht gefunden' });

    const fv = await FormVersion.findOne({ name, version }).setOptions({ tenantId });
    if (!fv) return res.status(404).json({ error: 'Version nicht gefunden' });

    fv.status = 'gesperrt';
    await fv.save();

    res.json({ success: true });
  } catch (err) {
    console.error('❌ lock:', err);
    res.status(500).json({ error: err.message });
  }
});

// Format-/Printvorlage zuweisen (Publisher/Admin)
router.put('/forms/:name/assign-templates', requirePerm(P.FORM_ASSIGN_TEMPLATES), async (req, res) => {
  const { name } = req.params;
  const { formFormatId, formPrintId } = req.body;
  const tenantId = req.tenantId;

  try {
    const form = await Form.findOne({ name }).setOptions({ tenantId });
    if (!form) return res.status(404).json({ error: 'Formular nicht gefunden' });

    if (formFormatId !== undefined) form.formFormatId = formFormatId;
    if (formPrintId !== undefined) form.formPrintId = formPrintId;

    await form.save();
    res.json({ success: true });
  } catch (err) {
    console.error('❌ assign-templates:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
