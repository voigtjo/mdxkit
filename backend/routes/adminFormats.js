const express = require('express');
const router = express.Router();
const FormFormat = require('../models/formFormat');

// Liste aller Formatvorlagen
router.get('/', async (req, res) => {
  try {
    const formats = await FormFormat.find().sort({ updatedAt: -1 });
    res.json(formats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Neue Vorlage hochladen
router.post('/', async (req, res) => {
  try {
    const { name, text } = req.body;

    // Duplikat mit gleichem Namen prüfen
    const existing = await FormFormat.findOne({ name });
    if (existing) {
      existing.text = text;
      existing.status = 'neu';
      existing.updatedAt = new Date();
      await existing.save();
      return res.json({ message: 'Vorlage aktualisiert', mode: 'update', id: existing._id });
    }

    const format = await FormFormat.create({ name, text });
    res.json({ message: 'Neue Vorlage gespeichert', mode: 'create', id: format._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Freigeben einer Vorlage
router.put('/release/:id', async (req, res) => {
  try {
    const updated = await FormFormat.findByIdAndUpdate(
      req.params.id,
      { status: 'freigegeben', updatedAt: new Date() },
      { new: true }
    );
    res.json({ message: 'Vorlage freigegeben', updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
