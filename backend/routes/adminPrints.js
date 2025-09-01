const express = require('express');
const router = express.Router();
const FormPrint = require('../models/formPrint');
const { requirePerm, PERMISSIONS: P } = require('../middleware/authz');

// Liste aller Printvorlagen (nur aktueller Tenant)
router.get('/', async (req, res) => {
  try {
    const prints = await FormPrint.find({})
      .setOptions({ tenantId: req.tenantId })
      .sort({ updatedAt: -1 });
    res.json(prints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Neue Printvorlage hochladen oder aktualisieren (tenant-scope)
router.post('/', requirePerm(P.FORM_ASSIGN_TEMPLATES), async (req, res) => {
  try {
    const { name, text } = req.body;
    const tenantId = req.tenantId;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name erforderlich' });
    }
    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'text (string) erforderlich' });
    }

    const existing = await FormPrint.findOne({ name })
      .setOptions({ tenantId });

    if (existing) {
      existing.text = text;
      existing.status = 'neu';
      existing.updatedAt = new Date();
      await existing.save();
      return res.json({ message: 'Vorlage aktualisiert', mode: 'update', id: existing._id });
    }

    const print = await FormPrint.create({ tenantId, name, text, status: 'neu', updatedAt: new Date() });
    res.json({ message: 'Neue Vorlage gespeichert', mode: 'create', id: print._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Printvorlage freigeben (nur im Tenant)
router.put('/release/:id', requirePerm(P.FORM_ASSIGN_TEMPLATES), async (req, res) => {
  try {
    const updated = await FormPrint.findOneAndUpdate(
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
