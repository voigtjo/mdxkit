const express = require('express');
const router = express.Router();

const { requireRoles } = require('../middleware/authz'); // 🆕 RBAC
const Form = require('../models/form');
const FormVersion = require('../models/formVersion');

// Formular hochladen oder aktualisieren
router.post('/upload-form', requireRoles('TenantAdmin', 'FormAuthor'), async (req, res) => {
  const { name, text } = req.body;
  const tenantId = req.tenantId;

  try {
    // Nur innerhalb des Tenants suchen
    const latest = await FormVersion.find({ name })
      .setOptions({ tenantId })
      .sort({ version: -1 })
      .limit(1);

    let version;
    let newVersion;
    let mode;

    if (latest.length > 0 && !latest[0].valid) {
      // Entwurf updaten
      latest[0].text = text;
      await latest[0].save();
      version = latest[0].version;
      mode = 'update';
    } else {
      // Neue Version anlegen
      version = latest.length > 0 ? latest[0].version + 1 : 1;
      newVersion = new FormVersion({ tenantId, name, version, text, valid: false });
      await newVersion.save();
      mode = 'new';
    }

    // Achtung: latest[0] kann bei Erstanlage undefined sein → safe fallback
    const currentVersionId = newVersion?._id || latest[0]?._id || null;

    // Form upserten – wichtig: tenantId in Filter (Plugin) + $setOnInsert
    const form = await Form.findOneAndUpdate(
      { name }, // Filter wird via tenantPlugin durch setOptions um tenantId erweitert
      {
        $set: {
          name,
          currentVersion: version,
          currentVersionId: currentVersionId,
          updatedAt: new Date(),
        },
        $setOnInsert: { tenantId }, // 🆕 stellt sicher, dass upserted Form den Tenant trägt
      },
      { upsert: true, new: true }
    ).setOptions({ tenantId });

    res.json({ success: true, version, mode });
  } catch (err) {
    console.error("❌ Fehler beim Hochladen des Formulars:", err);
    res.status(500).json({ error: err.message });
  }
});

// Formularversion freigeben
router.post('/forms/:name/release', requireRoles('TenantAdmin', 'FormPublisher'), async (req, res) => {
  const { name } = req.params;
  const tenantId = req.tenantId;

  try {
    // Form mit aktueller Version holen (tenant-scope)
    const form = await Form.findOne({ name })
      .setOptions({ tenantId })
      .populate('currentVersionId');

    if (!form || !form.currentVersionId) {
      return res.status(404).json({ error: 'Formular oder Version nicht gefunden' });
    }

    // Alle alten gültigen ungültig setzen (nur im Tenant!)
    await FormVersion.updateMany({ name, valid: true }, { valid: false })
      .setOptions({ tenantId });

    // Aktuelle Version gültig setzen
    form.currentVersionId.valid = true;
    await form.currentVersionId.save();

    // Metadaten an der Form nachziehen
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
router.get('/forms', requireRoles('TenantAdmin', 'FormAuthor', 'FormPublisher'), async (req, res) => {
  const tenantId = req.tenantId;
  try {
    const forms = await Form.find({})
      .setOptions({ tenantId })
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
router.get('/forms/:name/version/:version', requireRoles('TenantAdmin', 'FormAuthor', 'FormPublisher'), async (req, res) => {
  const { name, version } = req.params;
  try {
    const form = await FormVersion.findOne({ name, version: parseInt(version, 10) })
      .setOptions({ tenantId: req.tenantId });
    if (!form) return res.status(404).json({ error: 'Formularversion nicht gefunden' });
    res.json(form);
  } catch (err) {
    console.error("❌ Fehler beim Abrufen einer Formularversion:", err);
    res.status(500).json({ error: err.message });
  }
});

// Formular sperren (Version sperren)
// Erwartet im Body: { version: <Number> }
// Achtung: Dein ursprünglicher Code nutzte form.versions[*].status; in deinem Modell
// liegen Versionen aber in FormVersion. Wir setzen deshalb status='gesperrt' an der Version.
router.post('/forms/:name/lock', requireRoles('TenantAdmin'), async (req, res) => {
  const { name } = req.params;
  const { version } = req.body;
  const tenantId = req.tenantId;

  try {
    if (typeof version !== 'number') {
      return res.status(400).json({ error: 'version (Number) erforderlich' });
    }

    // Existiert die Form im Tenant?
    const base = await Form.findOne({ name }).setOptions({ tenantId });
    if (!base) return res.status(404).json({ error: 'Formular nicht gefunden' });

    // Konkrete Version holen und sperren
    const fv = await FormVersion.findOne({ name, version })
      .setOptions({ tenantId });

    if (!fv) return res.status(404).json({ error: 'Version nicht gefunden' });

    // ⚠️ Stelle sicher, dass dein FormVersion-Schema ein Feld "status" hat (enum empfohlen).
    fv.status = 'gesperrt';
    await fv.save();

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Fehler beim Sperren:", err);
    res.status(500).json({ error: err.message });
  }
});

// Format-/Printvorlage zuweisen
router.put('/forms/:name/assign-templates', requireRoles('TenantAdmin', 'FormPublisher'), async (req, res) => {
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
    console.error("❌ Fehler beim Zuweisen der Vorlagen:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
