// backend/routes/form.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router({ mergeParams: true });

const Tenant = require('../models/tenant');
const Form = require('../models/form');
const FormVersion = require('../models/formVersion');
const FormData = require('../models/formData');
const FormTestData = require('../models/formTestdata');
const Group = require('../models/group');
const User = require('../models/user');
const { requirePerm, PERMISSIONS: P } = require('../middleware/authz');

// ---------- Helpers ----------
const toOid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

async function resolveTenantObjectId(req) {
  if (req.tenant?._id) return req.tenant._id;

  const idOrKey = req.params?.tenantId || req.tenantId || req.headers['x-tenant'];
  if (!idOrKey) throw Object.assign(new Error('Missing tenant context'), { status: 400 });

  // key oder früheres tenantId-Feld
  const t = await Tenant.findOne({ $or: [{ key: idOrKey }, { tenantId: idOrKey }] })
    .select({ _id: 1, status: 1 })
    .lean();

  if (!t) throw Object.assign(new Error('Unknown tenant'), { status: 404 });
  if (t.status !== 'active') throw Object.assign(new Error('Tenant suspended'), { status: 423 });
  return t._id;
}

async function getFormWithEntry({ tenant, formName, userId = null, isTest = false }) {
  const DataModel = isTest ? FormTestData : FormData;

  if (isTest) {
    const formMeta = await Form.findOne({ tenant, name: formName })
      .populate('currentVersionId', 'text version')
      .lean();
    if (!formMeta || !formMeta.currentVersionId) throw new Error('Formular nicht gefunden');

    const version = formMeta.currentVersionId.version;
    const versionText = formMeta.currentVersionId.text;

    let entry = await DataModel.findOne({ tenant, formName, version }).lean();
    if (!entry) {
      entry = await DataModel.create({
        tenant,
        formName,
        version,
        data: {},
        status: 'neu',
        updatedAt: new Date(),
      });
    }
    return { text: versionText, format: '', data: entry };
  }

  // produktiv: es muss bereits eine Zuweisung existieren
  const uid = toOid(userId) || userId;
  const entry = await DataModel.findOne({ tenant, formName, userId: uid }).lean();
  if (!entry) throw Object.assign(new Error('Zuweisung nicht gefunden'), { status: 404 });

  const versionDoc = await FormVersion.findOne({ tenant, name: formName, version: entry.version }).lean();
  if (!versionDoc) throw Object.assign(new Error('Formularversion nicht gefunden'), { status: 404 });

  return { text: versionDoc.text, format: '', data: entry };
}

async function saveFormEntry({ tenant, id, data, signature, isTest = false }) {
  const Model = isTest ? FormTestData : FormData;

  if (!isTest) {
    const current = await Model.findOne({ tenant, _id: id }).lean();
    if (!current) throw Object.assign(new Error('Eintrag nicht gefunden'), { status: 404 });
    if (current.status === 'angenommen') {
      const err = new Error('Formular ist abgeschlossen und kann nicht mehr verändert werden');
      err.status = 409;
      throw err;
    }
  }

  const update = {
    data,
    ...(signature ? { signature } : {}),
    status: 'gespeichert',
    updatedAt: new Date(),
  };

  const updated = await Model.findOneAndUpdate({ tenant, _id: id }, update, { new: true }).lean();
  if (!updated) throw Object.assign(new Error('Eintrag nicht gefunden'), { status: 404 });
  return updated;
}

// ---------- Routes ----------

/** Sichtbare/gültige Formulare für den aktuellen User */
router.get('/available', async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);

    // Dev-Bypass: wenn SKIP_AUTH=true, Adminsicht aktivieren
    const skipAuthAdmin = String(process.env.SKIP_AUTH || '').toLowerCase() === 'true';
    const user = req.user || null;
    const isAdmin = skipAuthAdmin || !!(user && (user.isSystemAdmin || user.isTenantAdmin));
    const userGroupIds = (user?.memberships || []).map((m) => String(m.groupId));

    const forms = await Form.find({ tenant })
      .populate({ path: 'validVersionId', select: 'isGlobal groupIds version' })
      .lean();

    const filtered = isAdmin
      ? forms
      : forms.filter((f) => {
          const v = f.validVersionId;
          if (!v) return false;
          if (v.isGlobal) return true;
          const allowed = (v.groupIds || []).map(String);
          return allowed.some((id) => userGroupIds.includes(id));
        });

    res.json(
      filtered.map((f) => ({
        _id: String(f._id),
        name: f.name,
        title: f.title || f.name,
        isGlobal: !!f.validVersionId?.isGlobal,
        groupIds: (f.validVersionId?.groupIds || []).map(String),
        validVersion: f.validVersionId?.version ?? null,
        currentVersion: f.currentVersion ?? null,
        updatedAt: f.updatedAt,
      }))
    );
  } catch (err) {
    console.error('❌ Fehler bei GET /available:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** Produktiv: Formular + Datensatz für USER laden */
router.get('/:formName/:userId', async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const { formName, userId } = req.params;
    const result = await getFormWithEntry({ tenant, formName, userId, isTest: false });
    res.json(result);
  } catch (err) {
    console.error('❌ Fehler bei GET /:formName/:userId:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** Testmodus: Formular + Testdatensatz */
router.get('/test/:formName', async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const { formName } = req.params;
    const result = await getFormWithEntry({ tenant, formName, isTest: true });
    res.json({ ...result, mode: 'TEST' });
  } catch (err) {
    console.error('❌ Fehler bei GET /test/:formName:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** Speichern (PROD) */
router.put('/save/:id', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const { id } = req.params;
    const { data, signature } = req.body || {};
    const updated = await saveFormEntry({ tenant, id, data, signature, isTest: false });
    res.json(updated);
  } catch (err) {
    console.error('❌ Fehler bei PUT /save/:id:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** Speichern (TEST) */
router.put('/save-test/:id', async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const { id } = req.params;
    const { data, signature } = req.body || {};
    const updated = await saveFormEntry({ tenant, id, data, signature, isTest: true });
    res.json(updated);
  } catch (err) {
    console.error('❌ Fehler bei PUT /save-test/:id:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** Freigeben (PROD) */
router.post('/submit/:id', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const { id } = req.params;
    const { data, signature } = req.body || {};

    const entry = await FormData.findOne({ tenant, _id: id });
    if (!entry) return res.status(404).json({ error: 'Eintrag nicht gefunden' });
    if (entry.status === 'angenommen') {
      return res.status(409).json({ error: 'Formular ist abgeschlossen und kann nicht mehr freigegeben werden' });
    }
    entry.data = data;
    entry.signature = signature;
    entry.status = 'freigegeben';
    entry.updatedAt = new Date();
    await entry.save();

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Fehler bei POST /submit/:id:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** Freigeben (TEST) */
router.post('/submit-test/:id', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const { id } = req.params;
    const { data, signature } = req.body || {};

    const entry = await FormTestData.findOne({ tenant, _id: id });
    if (!entry) return res.status(404).json({ error: 'Eintrag nicht gefunden' });

    entry.data = data;
    entry.signature = signature;
    entry.status = 'freigegeben';
    entry.updatedAt = new Date();
    await entry.save();

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Fehler bei POST /submit-test/:id:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** Sichtbarkeit auf der (aktuellen/gültigen) Version setzen */
router.put('/:formId/meta', async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const { formId } = req.params;
    const target = req.query?.target === 'valid' ? 'valid' : 'current';
    const { isGlobal, groupIds } = req.body || {};

    if (!mongoose.isValidObjectId(formId)) {
      return res.status(400).json({ error: 'Invalid formId' });
    }
    if (typeof isGlobal !== 'boolean') {
      return res.status(400).json({ error: 'isGlobal (boolean) ist erforderlich' });
    }

    const form = await Form.findOne({ tenant, _id: formId })
      .populate('currentVersionId')
      .populate('validVersionId')
      .lean();

    if (!form) return res.status(404).json({ error: 'Formular nicht gefunden' });

    const versionDoc = target === 'valid' ? form.validVersionId : form.currentVersionId;
    if (!versionDoc) {
      return res
        .status(400)
        .json({ error: `Keine ${target === 'valid' ? 'gültige' : 'Arbeits-'}Version vorhanden` });
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

      const groups = await Group.find({ _id: { $in: oids }, tenant, status: { $ne: 'deleted' } })
        .select({ _id: 1 })
        .lean();
      if (groups.length !== oids.length) {
        return res.status(400).json({ error: 'Mindestens eine Gruppe gehört nicht zu diesem Tenant / existiert nicht' });
      }
      updates.groupIds = oids;
    }

    const updated = await FormVersion.findOneAndUpdate(
      { tenant, _id: versionDoc._id },
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
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** Helper: User-Display für Formularanzeige (vom Frontend erwartet) */
router.get('/user/:userId', async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const uid = req.params.userId;
    if (!mongoose.isValidObjectId(uid)) return res.status(400).json({ error: 'Invalid userId' });

    const u = await User.findOne({ _id: uid, tenant })
      .select('_id displayName name email')
      .lean();
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json({
      _id: String(u._id),
      name: u.displayName || u.name || u.email || '',
      email: u.email || '',
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
