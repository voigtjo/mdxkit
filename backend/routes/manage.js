// backend/routes/manage.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router({ mergeParams: true });

const Tenant = require('../models/tenant');
const Form = require('../models/form');
const FormData = require('../models/formData');
const { requirePerm, PERMISSIONS: P } = require('../middleware/authz');

const toOid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

async function resolveTenantObjectId(req) {
  if (req.tenant?._id) return req.tenant._id;
  const idOrKey = req.params?.tenantId || req.tenantId || req.headers['x-tenant'];
  if (!idOrKey) throw Object.assign(new Error('Missing tenant context'), { status: 400 });

  const t = await Tenant.findOne({ $or: [{ key: idOrKey }, { tenantId: idOrKey }] })
    .select({ _id: 1, status: 1 })
    .lean();
  if (!t) throw Object.assign(new Error('Unknown tenant'), { status: 404 });
  if (t.status !== 'active') throw Object.assign(new Error('Tenant suspended'), { status: 423 });
  return t._id;
}

/** Formular einem Nutzer zuweisen (nur gültige Version) */
router.post('/assign', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const { formName, userId, patientId } = req.body || {};
    const effectiveUserId = userId || patientId;
    if (!formName || !effectiveUserId) {
      return res.status(400).json({ error: 'formName und userId erforderlich' });
    }

    // Referenz-Variante: gültige Version über validVersionId (populate) ermitteln
    const form = await Form.findOne({ tenant, name: formName })
      .populate('validVersionId', 'version')
      .lean();
    if (!form) return res.status(404).json({ error: 'Formular nicht gefunden' });
    if (!form.validVersionId) {
      return res.status(409).json({ error: 'Keine gültige Version vorhanden (Form nicht freigegeben)' });
    }
    const version = form.validVersionId.version;

    const uid = toOid(effectiveUserId) || effectiveUserId;

    // Duplikate vermeiden (offen/gespeichert)
    const existsOpen = await FormData.findOne({
      tenant, formName, version, userId: uid, status: { $in: ['offen', 'gespeichert'] }
    }).lean();
    if (existsOpen) {
      return res.status(409).json({ error: 'Es existiert bereits eine offene Zuweisung für diesen Nutzer.' });
    }

    const entry = await FormData.create({
      tenant,
      formName,
      version,
      userId: uid,
      status: 'offen',
      data: {},
      updatedAt: new Date(),
    });

    res.status(201).json({ success: true, id: entry._id });
  } catch (err) {
    console.error('❌ manage/assign:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** Freigegeben -> angenommen */
router.post('/accept/:id', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const entry = await FormData.findOne({ tenant, _id: req.params.id });
    if (!entry) return res.status(404).json({ error: 'Nicht gefunden' });
    if (entry.status !== 'freigegeben') {
      return res.status(409).json({ error: 'Nur freigegebene Formulare können akzeptiert werden' });
    }
    entry.status = 'angenommen';
    entry.updatedAt = new Date();
    await entry.save();
    res.json({ success: true, id: entry._id });
  } catch (err) {
    console.error('❌ manage/accept:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** Freigegeben -> offen (erneut zuweisen) */
router.post('/reopen/:id', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const entry = await FormData.findOne({ tenant, _id: req.params.id });
    if (!entry) return res.status(404).json({ error: 'Nicht gefunden' });
    if (entry.status !== 'freigegeben') {
      return res.status(409).json({ error: 'Nur freigegebene Formulare können erneut zugewiesen werden' });
    }
    entry.status = 'offen';
    entry.signature = null;
    entry.updatedAt = new Date();
    await entry.save();
    res.json({ success: true, id: entry._id });
  } catch (err) {
    console.error('❌ manage/reopen:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** Einträge nach Formularname */
router.get('/byForm/:formName', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const list = await FormData.find({ tenant, formName: req.params.formName }).sort({ updatedAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    console.error('❌ manage/byForm:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** Alias-Route alt: byPatient -> byUser */
router.get('/byPatient/:patientId', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const uid = toOid(req.params.patientId) || req.params.patientId;
    const list = await FormData.find({ tenant, userId: uid }).sort({ updatedAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    console.error('❌ manage/byPatient:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** Empfohlen: byUser */
router.get('/byUser/:userId', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const uid = toOid(req.params.userId) || req.params.userId;
    const list = await FormData.find({ tenant, userId: uid }).sort({ updatedAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    console.error('❌ manage/byUser:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/** Zuweisung löschen (nur offen) */
router.delete('/assignment/:id', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const entry = await FormData.findOne({ tenant, _id: req.params.id });
    if (!entry) return res.status(404).json({ error: 'Nicht gefunden' });
    if (entry.status !== 'offen') {
      return res.status(409).json({ error: 'Nur offene Formulare können gelöscht werden' });
    }
    await entry.deleteOne();
    res.json({ success: true, deleted: entry._id });
  } catch (err) {
    console.error('❌ manage/assignment DELETE:', err);
    res.status(err.status || 500).json({ error: 'Fehler beim Löschen' });
  }
});

/** Alle Formulardaten im Tenant */
router.get('/allFormData', requirePerm(P.FORMDATA_EDIT), async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const list = await FormData.find({ tenant }).sort({ updatedAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    console.error('❌ manage/allFormData:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
