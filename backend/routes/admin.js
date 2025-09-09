// backend/routes/admin.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router({ mergeParams: true });

const Tenant = require('../models/tenant');
const Form = require('../models/form');
const FormVersion = require('../models/formVersion');
// ⛔️ KEINE formFormat / formPrint Requires mehr

// Optional: feingranulare Rechte (wenn du willst, sonst nur authRequired im server.js)
// const { requirePerm, PERMISSIONS: P } = require('../middleware/authz');

const toOid = (v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null);

/** Tenant-Resolver – wie in form/manage genutzt */
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

/** GET /admin/forms – Liste mit Meta (gültig/aktuell) */
router.get('/forms', async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);

    const list = await Form.find({ tenant })
      .populate({ path: 'validVersionId', select: 'version isGlobal groupIds updatedAt' })
      .populate({ path: 'currentVersionId', select: 'version updatedAt' })
      .lean();

    const mapped = (list || []).map(f => ({
      _id: String(f._id),
      name: f.name,
      title: f.title || f.name,
      // Nummern-Fallbacks, falls keine Referenzen gepflegt sind:
      validVersion: f.validVersionId?.version ?? f.validVersion ?? null,
      currentVersion: f.currentVersionId?.version ?? f.currentVersion ?? null,
      // Sichtbarkeit (für AdminForms-Merge mit /form/available)
      isGlobal: !!f.validVersionId?.isGlobal,
      groupIds: (f.validVersionId?.groupIds || []).map(String),
      // Zeit
      updatedAt: f.updatedAt || f.validVersionId?.updatedAt || f.currentVersionId?.updatedAt || null,
      // Alte Template-Felder existieren nicht mehr → null zur Kompatibilität
      formFormatId: null,
      formPrintId: null,
      status: f.status || 'active',
    }));

    res.json(mapped);
  } catch (err) {
    console.error('admin/forms:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /admin/upload-form
 * Body: { name, text }
 * - legt neue Version an (current), form + formVersion
 * - gibt { success, version, mode: 'create'|'update' } zurück
 */
router.post('/upload-form', async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const { name, text } = req.body || {};
    if (!name || !text) return res.status(400).json({ error: 'name & text erforderlich' });

    // Form holen/erzeugen
    let form = await Form.findOne({ tenant, name }).lean();
    const mode = form ? 'update' : 'create';

    // neue Versionsnummer
    const newVersion =
      (form?.currentVersionId ? form.currentVersionId.version : null) ??
      (form?.currentVersion ?? 0) + 1;

    // Version anlegen
    const vdoc = await FormVersion.create({
      tenant,
      name,
      version: newVersion,
      text,
      isGlobal: true,     // Default Sichtbarkeit der Version
      groupIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Form updaten/anlegen
    if (form) {
      await Form.updateOne(
        { _id: form._id },
        {
          $set: {
            currentVersion: newVersion,       // Fallback Feld (Zahl)
            currentVersionId: vdoc._id,       // Referenz (empfohlen)
            updatedAt: new Date(),
          },
        }
      );
    } else {
      form = await Form.create({
        tenant,
        name,
        title: name,
        currentVersion: newVersion,
        currentVersionId: vdoc._id,
        validVersion: null,
        validVersionId: null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    res.json({ success: true, version: newVersion, mode });
  } catch (err) {
    console.error('admin/upload-form:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /admin/forms/:name/release
 * Body: { version }
 * - setzt validVersion (+ validVersionId) auf die gewünschte Version
 */
router.post('/forms/:name/release', async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const { name } = req.params;
    const { version } = req.body || {};
    if (!Number.isInteger(version) || version <= 0) {
      return res.status(400).json({ error: 'version (positive Integer) erforderlich' });
    }

    const vdoc = await FormVersion.findOne({ tenant, name, version }).lean();
    if (!vdoc) return res.status(404).json({ error: 'Version nicht gefunden' });

    const updated = await Form.findOneAndUpdate(
      { tenant, name },
      { $set: { validVersion: version, validVersionId: vdoc._id, updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: 'Formular nicht gefunden' });
    res.json({ success: true, name, validVersion: version });
  } catch (err) {
    console.error('admin/forms/:name/release:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /admin/forms/:name/lock
 * Body: { version }
 * - markiert eine Version als „locked“ (optional – zur Info)
 */
router.post('/forms/:name/lock', async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const { name } = req.params;
    const { version } = req.body || {};
    if (!Number.isInteger(version) || version <= 0) {
      return res.status(400).json({ error: 'version (positive Integer) erforderlich' });
    }

    const vdoc = await FormVersion.findOneAndUpdate(
      { tenant, name, version },
      { $set: { locked: true, updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!vdoc) return res.status(404).json({ error: 'Version nicht gefunden' });
    res.json({ success: true, name, version, locked: true });
  } catch (err) {
    console.error('admin/forms/:name/lock:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /admin/forms/:name/version/:version
 * - liefert den reinen Formulartest (Text) + Basis-Meta
 */
router.get('/forms/:name/version/:version', async (req, res) => {
  try {
    const tenant = await resolveTenantObjectId(req);
    const { name, version } = req.params;
    const ver = parseInt(version, 10);
    if (!Number.isInteger(ver) || ver <= 0) {
      return res.status(400).json({ error: 'Ungültige version' });
    }

    const vdoc = await FormVersion.findOne({ tenant, name, version: ver }).lean();
    if (!vdoc) return res.status(404).json({ error: 'Version nicht gefunden' });

    res.json({
      _id: String(vdoc._id),
      name,
      version: vdoc.version,
      text: vdoc.text,
      updatedAt: vdoc.updatedAt,
      isGlobal: !!vdoc.isGlobal,
      groupIds: (vdoc.groupIds || []).map(String),
    });
  } catch (err) {
    console.error('admin/forms/:name/version/:version:', err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * PUT /admin/forms/:name/assign-templates
 * Body: { formFormatId, formPrintId }
 * - Feature entfernt → No-Op für Kompatibilität
 */
router.put('/forms/:name/assign-templates', async (_req, res) => {
  res.json({ success: true, note: 'Templates-Funktion entfernt (No-Op)' });
});

module.exports = router;
