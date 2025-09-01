const express = require('express');
const router = express.Router();
const FormFormat = require('../models/formFormat');
const { requirePerm, PERMISSIONS: P } = require('../middleware/authz');

// Liste aller Formatvorlagen (nur des aktuellen Tenants)
router.get('/', async (req, res) => {
  try {
    const formats = await FormFormat.find({})
      .setOptions({ tenantId: req.tenantId })
      .sort({ updatedAt: -1 });
    res.json(formats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Neue Vorlage hochladen oder bestehende (gleicher Name) im Tenant aktualisieren
router.post('/', async (req, res) => {
  try {
    const { name, text } = req.body;
    const tenantId = req.tenantId;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name erforderlich' });
    }
    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'text (string) erforderlich' });
    }

    // Duplikat mit gleichem Namen prüfen (tenant-scope)
    const existing = await FormFormat.findOne({ name })
      .setOptions({ tenantId });

    if (existing) {
      existing.text = text;
      existing.status = 'neu';
      existing.updatedAt = new Date();
      await existing.save();
      return res.json({ message: 'Vorlage aktualisiert', mode: 'update', id: existing._id });
    }

    const format = await FormFormat.create({ tenantId, name, text, status: 'neu', updatedAt: new Date() });
    res.json({ message: 'Neue Vorlage gespeichert', mode: 'create', id: format._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Freigeben einer Vorlage (nur innerhalb des Tenants)
router.put('/release/:id', async (req, res) => {
  try {
    const updated = await FormFormat.findOneAndUpdate(
      { _id: req.params.id },
      { status: 'freigegeben', updatedAt: new Date() },
      { new: true }
    ).setOptions({ tenantId: req.tenantId });

    if (!updated) {
      return res.status(404).json({ error: 'Vorlage nicht gefunden' });
    }
    res.json({ message: 'Vorlage freigegeben', updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
