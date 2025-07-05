const express = require('express');
const router = express.Router();
const FormPrint = require('../models/formPrint');

// Liste aller Printvorlagen
router.get('/', async (req, res) => {
  try {
    const prints = await FormPrint.find().sort({ updatedAt: -1 });
    res.json(prints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Neue Printvorlage hochladen oder aktualisieren
router.post('/', async (req, res) => {
  try {
    const { name, text } = req.body;

    const existing = await FormPrint.findOne({ name });
    if (existing) {
      existing.text = text;
      existing.status = 'neu';
      existing.updatedAt = new Date();
      await existing.save();
      return res.json({ message: 'Vorlage aktualisiert', mode: 'update', id: existing._id });
    }

    const print = await FormPrint.create({ name, text });
    res.json({ message: 'Neue Vorlage gespeichert', mode: 'create', id: print._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Printvorlage freigeben
router.put('/release/:id', async (req, res) => {
  try {
    const updated = await FormPrint.findByIdAndUpdate(
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
