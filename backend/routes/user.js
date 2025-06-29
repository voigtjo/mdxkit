// routes/user.js
const express = require('express');
const router = express.Router();

const Form = require('../models/form');
const FormVersion = require('../models/formVersion');
const FormData = require('../models/formData');

// Formular anzeigen für Eingabe
router.get('/form/:formName/:patientId', async (req, res) => {
  try {
    const { formName, patientId } = req.params;
    const form = await Form.findOne({ name: formName });
    if (!form) return res.status(404).json({ error: 'Formular nicht gefunden' });

    const version = await FormVersion.findOne({ name: formName, version: form.currentVersion });
    const entry = await FormData.findOne({ formName, patientId, version: form.currentVersion });
    if (!entry) return res.status(404).json({ error: 'Zuweisung nicht gefunden' });

    res.json({ text: version.text, data: entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Formular speichern
router.put('/save/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, signature } = req.body;

    console.log(`🔧 [SAVE] id=${id}`);
    if (signature) {
      console.log(`🖼️ Signature vorhanden (Länge: ${signature.length})`);
      console.log("📎 Vorschau:", signature.substring(0, 50));
    } else {
      console.log("🚫 Keine Signature übergeben");
    }

    const updated = await FormData.findByIdAndUpdate(
      id,
      { data, ...(signature ? { signature } : {}), status: 'gespeichert' },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Eintrag nicht gefunden' });

    res.json(updated);
  } catch (err) {
    console.error(`❌ [SAVE] Fehler:`, err);
    res.status(500).json({ error: err.message });
  }
});


router.post('/submit/:id', async (req, res) => {
  try {
    const { data, signature } = req.body;

    console.log(`🔧 [SUBMIT] id=${req.params.id}`);
    console.log(`📄 Datenkeys:`, Object.keys(data || {}));
    if (signature) {
      console.log(`🖋️ Signature vorhanden (Länge: ${signature.length})`);
      console.log("📎 Vorschau:", signature.substring(0, 50));
    } else {
      console.warn("🚫 Keine Signature empfangen!");
    }

    const entry = await FormData.findById(req.params.id);
    if (!entry) {
      console.warn(`⚠️ Kein Eintrag mit id=${req.params.id} gefunden`);
      return res.status(404).json({ error: 'Eintrag nicht gefunden' });
    }

    entry.data = data;
    entry.signature = signature;
    entry.status = 'freigegeben';
    entry.updatedAt = new Date();
    await entry.save();

    res.json({ success: true });
  } catch (err) {
    console.error(`❌ Fehler bei /submit/:id`, err);
    res.status(500).json({ error: err.message });
  }
});




module.exports = router;