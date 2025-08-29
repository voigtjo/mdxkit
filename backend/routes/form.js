const express = require('express');
const router = express.Router({ mergeParams: true });
const mongoose = require('mongoose');

const Form = require('../models/form');
const FormVersion = require('../models/formVersion');
const FormData = require('../models/formData');
const FormTestData = require('../models/formTestdata');
const Group = require('../models/group');

const toOid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

// --- Helpers ---
async function getFormWithEntry({ formName, patientId = null, isTest = false, tenantId }) {
  const DataModel = isTest ? FormTestData : FormData;

  if (isTest) {
    const formMeta = await Form.findOne({ name: formName, tenantId })
      .populate('currentVersionId')
      .lean();
    if (!formMeta || !formMeta.currentVersionId) throw new Error('Formular nicht gefunden');

    const versionText = formMeta.currentVersionId.text;
    const version     = formMeta.currentVersionId.version;

    let entry = await DataModel.findOne({ formName, version }).setOptions({ tenantId });
    if (!entry) {
      entry = await DataModel.create({
        tenantId, formName, version, data: {}, status: 'neu', updatedAt: new Date()
      });
    }
    return { text: versionText, format: "", data: entry };
  }

  // produktiv
  const entry = await DataModel.findOne({ formName, patientId }).setOptions({ tenantId });
  if (!entry) throw new Error('Zuweisung nicht gefunden');

  const versionDoc = await FormVersion.findOne({ name: formName, version: entry.version, tenantId });
  if (!versionDoc) throw new Error('Formularversion nicht gefunden');

  return { text: versionDoc.text, format: "", data: entry };
}

// Speichern – blockiert, wenn 'angenommen'
async function saveFormEntry({ id, data, signature, isTest = false, tenantId }) {
  const Model = isTest ? FormTestData : FormData;
  if (!isTest) {
    const current = await Model.findOne({ _id: id }).setOptions({ tenantId });
    if (!current) throw new Error('Eintrag nicht gefunden');
    if (current.status === 'angenommen') {
      const err = new Error('Formular ist abgeschlossen und kann nicht mehr verändert werden');
      err.status = 409; throw err;
    }
  }
  const update = { data, ...(signature ? { signature } : {}), status: 'gespeichert', updatedAt: new Date() };
  const updated = await Model.findOneAndUpdate({ _id: id }, update, { new: true }).setOptions({ tenantId });
  if (!updated) throw new Error('Eintrag nicht gefunden');
  return updated;
}

// Submit – blockiert, wenn 'angenommen'
async function submitFormEntry({ id, data, signature, isTest = false, tenantId }) {
  const Model = isTest ? FormTestData : FormData;
  const entry = await Model.findOne({ _id: id }).setOptions({ tenantId });
  if (!entry) throw new Error('Eintrag nicht gefunden');
  if (!isTest && entry.status === 'angenommen') {
    const err = new Error('Formular ist abgeschlossen und kann nicht mehr freigegeben werden');
    err.status = 409; throw err;
  }
  entry.data = data;
  entry.signature = signature;
  entry.status = 'freigegeben';
  entry.updatedAt = new Date();
  await entry.save();
  return entry;
}

/* ----------------------------------------------------------------
   Sichtbare Formulare (aus gültiger Version)
   GET /api/tenant/:tenantId/form/available
------------------------------------------------------------------*/
router.get('/available', async (req, res) => {
  try {
    const tenantId = req.tenantId;

    // Dev-Bypass: wenn SKIP_AUTH=true, Adminsicht aktivieren
    const skipAuthAdmin =
      String(process.env.SKIP_AUTH || '').toLowerCase() === 'true';

    const user = req.user || null;
    const isAdmin = skipAuthAdmin || !!(user && (user.isSystemAdmin || user.isTenantAdmin));
    const userGroupIds = (user?.memberships || []).map(m => String(m.groupId));

    const forms = await Form.find({ tenantId })
      .populate({ path: 'validVersionId', select: 'isGlobal groupIds version' })
      .lean();

    const filtered = isAdmin ? forms : forms.filter(f => {
      const v = f.validVersionId;
      if (!v) return false;               // ohne gültige Version unsichtbar
      if (v.isGlobal) return true;
      const allowed = (v.groupIds || []).map(String);
      return allowed.some(id => userGroupIds.includes(id));
    });

    res.json(filtered.map(f => ({
      _id: String(f._id),
      name: f.name,
      title: f.title || f.name,
      isGlobal: !!f.validVersionId?.isGlobal,
      groupIds: (f.validVersionId?.groupIds || []).map(String),
      validVersion: f.validVersionId?.version ?? null,
      currentVersion: f.currentVersion ?? null,
      updatedAt: f.updatedAt,
    })));
  } catch (err) {
    console.error('❌ Fehler bei GET /available:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ----------------------------------------------------------------
   Sichtbarkeit auf der Version setzen (Admin)
   PUT /api/tenant/:tenantId/form/:formId/meta?target=current|valid  (default: current)
   Body: { isGlobal: boolean, groupIds?: [groupId] }
------------------------------------------------------------------*/
router.put('/:formId/meta', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { formId } = req.params;
    const target = (req.query?.target === 'valid') ? 'valid' : 'current';
    const { isGlobal, groupIds } = req.body || {};

    if (!mongoose.isValidObjectId(formId)) {
      return res.status(400).json({ error: 'Invalid formId' });
    }
    if (typeof isGlobal !== 'boolean') {
      return res.status(400).json({ error: 'isGlobal (boolean) ist erforderlich' });
    }

    const form = await Form.findOne({ _id: formId, tenantId })
      .populate('currentVersionId')
      .populate('validVersionId')
      .lean();
    if (!form) return res.status(404).json({ error: 'Formular nicht gefunden' });

    const versionDoc = (target === 'valid') ? form.validVersionId : form.currentVersionId;
    if (!versionDoc) {
      return res.status(400).json({ error: `Keine ${target === 'valid' ? 'gültige' : 'Arbeits-'}Version vorhanden` });
    }

    const updates = { isGlobal };
    if (isGlobal === true) {
      updates.groupIds = [];
    } else {
      if (!Array.isArray(groupIds) || groupIds.length === 0) {
        return res.status(400).json({ error: 'groupIds (non-empty) erforderlich, wenn isGlobal=false' });
      }
      const oids = groupIds.map(toOid).filter(Boolean);
      if (oids.length !== groupIds.length) return res.status(400).json({ error: 'Ungültige groupIds' });

      // Validieren: Gruppen gehören zum Tenant (und sind nicht deleted)
      const groups = await Group.find({ _id: { $in: oids }, tenantId, status: { $ne: 'deleted' } })
        .select({ _id: 1 }).lean();
      if (groups.length !== oids.length) {
        return res.status(400).json({ error: 'Mindestens eine Gruppe gehört nicht zu diesem Tenant / existiert nicht' });
      }
      updates.groupIds = oids;
    }

    const updated = await FormVersion.findOneAndUpdate(
      { _id: versionDoc._id, tenantId },
      { $set: updates },
      { new: true }
    ).lean();

    res.json({
      _id: String(form._id),
      name: form.name,
      target,
      isGlobal: !!updated.isGlobal,
      groupIds: (updated.groupIds || []).map(String),
    });
  } catch (err) {
    console.error('❌ Fehler bei PUT /:formId/meta:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ----------------------------------------------------------------
   Bestehende Endpoints – unverändert
------------------------------------------------------------------*/

// Produktivformular laden
router.get('/:formName/:patientId', async (req, res) => {
  try {
    const { formName, patientId } = req.params;
    const tenantId = req.tenantId;
    const result = await getFormWithEntry({ formName, patientId, isTest: false, tenantId });
    res.json(result);
  } catch (err) {
    console.error('❌ Fehler bei GET /:formName/:patientId:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Testformular laden/erstellen
router.get('/test/:formName', async (req, res) => {
  try {
    const { formName } = req.params;
    const tenantId = req.tenantId;
    const result = await getFormWithEntry({ formName, isTest: true, tenantId });
    res.json({ ...result, mode: 'TEST' });
  } catch (err) {
    console.error('❌ Fehler bei GET /test/:formName:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Speichern (PROD/TEST)
router.put('/save/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, signature } = req.body;
    const tenantId = req.tenantId;
    const updated = await saveFormEntry({ id, data, signature, isTest: false, tenantId });
    res.json(updated);
  } catch (err) {
    console.error('❌ Fehler bei PUT /save/:id:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.put('/save-test/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, signature } = req.body;
    const tenantId = req.tenantId;
    const updated = await saveFormEntry({ id, data, signature, isTest: true, tenantId });
    res.json(updated);
  } catch (err) {
    console.error('❌ Fehler bei PUT /save-test/:id:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Submit (PROD/TEST)
router.post('/submit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, signature } = req.body;
    const tenantId = req.tenantId;
    await submitFormEntry({ id, data, signature, isTest: false, tenantId });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Fehler bei POST /submit/:id:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/submit-test/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, signature } = req.body;
    const tenantId = req.tenantId;
    await submitFormEntry({ id, data, signature, isTest: true, tenantId });
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Fehler bei POST /submit-test/:id:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
