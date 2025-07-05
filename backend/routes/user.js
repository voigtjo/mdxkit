// routes/user.js
const express = require('express');
const router = express.Router();

const Form = require('../models/form');
const FormVersion = require('../models/formVersion');

const FormData = require('../models/formData');
const FormTestData = require('../models/formTestdata');

  // Hilfsfunktion zur Form-Ladung
  async function getFormWithEntry({ formName, patientId = null, isTest = false }) {
    const DataModel = isTest ? FormTestData : FormData;
    let entry;

    if (isTest) {
      // Formular-Metadaten + Formatvorlage laden
      const formMeta = await Form.findOne({ name: formName })
        .populate('currentVersionId')
        .populate('formFormatId'); // 🆕 Formatvorlage mitladen

      if (!formMeta || !formMeta.currentVersionId) {
        throw new Error('Formular nicht gefunden');
      }

      const version = formMeta.currentVersion;
      const versionText = formMeta.currentVersionId.text;
      const formatText = formMeta.formFormatId?.text || ""; // 🆕 Formattext

      // Testdatensatz suchen oder erstellen
      entry = await DataModel.findOne({ formName, version });
      if (!entry) {
        entry = await DataModel.create({ formName, version, data: {}, status: 'neu' });
      }

      return {
        text: versionText,
        format: formatText, // 🆕 mitgeben
        data: entry
      };
    } else {
      // Produktivmodus: Formulardaten suchen
      entry = await DataModel.findOne({ formName, patientId });
      if (!entry) {
        throw new Error('Zuweisung nicht gefunden');
      }

      const version = entry.version;

      // Versionstext holen
      const versionDoc = await FormVersion.findOne({ name: formName, version });
      if (!versionDoc) {
        throw new Error('Formularversion nicht gefunden');
      }

      // Formattext holen (aus Form-Metadaten)
      const form = await Form.findOne({ name: formName }).populate('formFormatId');
      const formatText = form?.formFormatId?.text || ""; // 🆕

      return {
        text: versionDoc.text,
        format: formatText, // 🆕 mitgeben
        data: entry
      };
    }
  }


// 💾 Gemeinsame Save-Funktion
async function saveFormEntry({ id, data, signature, isTest = false }) {
  const Model = isTest ? FormTestData : FormData;

  const update = {
    data,
    ...(signature ? { signature } : {}),
    status: 'gespeichert',
    updatedAt: new Date(),
  };

  const updated = await Model.findByIdAndUpdate(id, update, { new: true });
  if (!updated) throw new Error('Eintrag nicht gefunden');
  return updated;
}

// ✅ Gemeinsame Submit-Funktion
async function submitFormEntry({ id, data, signature, isTest = false }) {
  const Model = isTest ? FormTestData : FormData;

  const entry = await Model.findById(id);
  if (!entry) throw new Error('Eintrag nicht gefunden');

  entry.data = data;
  entry.signature = signature;
  entry.status = 'freigegeben';
  entry.updatedAt = new Date();
  await entry.save();

  return entry;
}



router.get('/form/:formName/:patientId', async (req, res) => {
  try {
    const { formName, patientId } = req.params;
    const result = await getFormWithEntry({ formName, patientId, isTest: false });
    res.json(result);
  } catch (err) {
    console.error("❌ Fehler bei /form:", err);
    res.status(500).json({ error: err.message });
  }
});


router.get('/form-test/:formName', async (req, res) => {
  try {
    const { formName } = req.params;
    const result = await getFormWithEntry({ formName, isTest: true });
    res.json({ ...result, mode: 'TEST' });
  } catch (err) {
    console.error("❌ Fehler bei /form-test:", err);
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
      console.log("🖼️ Signature vorhanden");
    }

    const updated = await saveFormEntry({ id, data, signature, isTest: false });
    res.json(updated);
  } catch (err) {
    console.error("❌ Fehler bei /save:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/save-test/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, signature } = req.body;

    console.log(`🧪 [SAVE-TEST] id=${id}`);
    const updated = await saveFormEntry({ id, data, signature, isTest: true });
    res.json(updated);
  } catch (err) {
    console.error("❌ Fehler bei /save-test:", err);
    res.status(500).json({ error: err.message });
  }
});



router.post('/submit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, signature } = req.body;

    console.log(`🔧 [SUBMIT] id=${id}`);
    const result = await submitFormEntry({ id, data, signature, isTest: false });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Fehler bei /submit:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/submit-test/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, signature } = req.body;

    console.log(`🧪 [SUBMIT-TEST] id=${id}`);
    const result = await submitFormEntry({ id, data, signature, isTest: true });
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Fehler bei /submit-test:", err);
    res.status(500).json({ error: err.message });
  }
});





module.exports = router;