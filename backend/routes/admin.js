// backend/routes/admin.js
// Tenant-scope admin endpoints for managing forms and versions
// Mounted at: /api/tenant/:tenantId/admin
const express = require('express');
const router = express.Router();

const Form = require('../models/form');
const FormVersion = require('../models/formVersion');
const FormFormat = require('../models/formFormat');
const FormPrint = require('../models/formPrint');

// All routes here assume req.tenant is set by tenantFromParam and user is authenticated.

function normName(name) {
  return String(name || '').trim();
}

// GET /admin/forms – list all forms for tenant
router.get('/forms', async (req, res, next) => {
  try {
    const list = await Form.find({ tenantId: req.tenant }, { __v: 0 }).sort({ updatedAt: -1 }).lean();
    res.json(list);
  } catch (err) { next(err); }
});

// POST /admin/upload-form  { name, text } – create/update draft
router.post('/upload-form', async (req, res, next) => {
  try {
    const { name, text } = req.body || {};
    const n = normName(name);
    if (!n || !text) return res.status(400).json({ error: 'name and text are required' });

    let form = await Form.findOne({ tenantId: req.tenant, name: n });
    if (!form) {
      form = await Form.create({
        tenantId: req.tenant,
        name: n,
        currentVersion: 1,
        validVersion: null,
        status: 'draft',
      });
      await FormVersion.create({
        formId: form._id,
        tenantId: req.tenant,
        version: 1,
        text,
        status: 'draft',
      });
      return res.json({ success: true, mode: 'create', version: 1 });
    }

    let version = form.currentVersion || 1;
    const cur = await FormVersion.findOne({ formId: form._id, version });
    if (cur && cur.status !== 'locked' && cur.status !== 'valid') {
      cur.text = text;
      cur.status = 'draft';
      await cur.save();
      form.status = 'draft';
      await form.save();
      return res.json({ success: true, mode: 'update', version });
    }

    version = version + 1;
    await FormVersion.create({
      formId: form._id,
      tenantId: req.tenant,
      version,
      text,
      status: 'draft',
    });
    form.currentVersion = version;
    form.status = 'draft';
    await form.save();
    res.json({ success: true, mode: 'update', version });
  } catch (err) { next(err); }
});

// POST /admin/forms/:name/release  { version } – mark version valid
router.post('/forms/:name/release', async (req, res, next) => {
  try {
    const name = normName(req.params.name);
    const { version } = req.body || {};
    if (!version || !Number.isInteger(version)) {
      return res.status(400).json({ error: 'version must be integer' });
    }

    const form = await Form.findOne({ tenantId: req.tenant, name });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    const ver = await FormVersion.findOne({ formId: form._id, version });
    if (!ver) return res.status(404).json({ error: 'Version not found' });
    if (ver.status === 'locked') return res.status(400).json({ error: 'Version is locked' });

    ver.status = 'valid';
    await ver.save();
    form.validVersion = version;
    form.status = 'valid';
    await form.save();

    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /admin/forms/:name/lock  { version } – lock a version
router.post('/forms/:name/lock', async (req, res, next) => {
  try {
    const name = normName(req.params.name);
    const { version } = req.body || {};
    if (!version || !Number.isInteger(version)) {
      return res.status(400).json({ error: 'version must be integer' });
    }

    const form = await Form.findOne({ tenantId: req.tenant, name });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    const ver = await FormVersion.findOne({ formId: form._id, version });
    if (!ver) return res.status(404).json({ error: 'Version not found' });

    ver.status = 'locked';
    await ver.save();
    if (form.currentVersion === version && form.status !== 'valid') {
      form.status = 'locked';
      await form.save();
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /admin/forms/:name/version/:version – fetch text of specific version
router.get('/forms/:name/version/:version', async (req, res, next) => {
  try {
    const name = normName(req.params.name);
    const version = parseInt(req.params.version, 10);
    if (!version) return res.status(400).json({ error: 'Invalid version' });

    const form = await Form.findOne({ tenantId: req.tenant, name });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    const ver = await FormVersion.findOne({ formId: form._id, version });
    if (!ver) return res.status(404).json({ error: 'Version not found' });

    res.json({ text: ver.text, version: ver.version, status: ver.status, formId: form._id });
  } catch (err) { next(err); }
});

// PUT /admin/forms/:name/assign-templates  { formFormatId?, formPrintId? }
router.put('/forms/:name/assign-templates', async (req, res, next) => {
  try {
    const name = normName(req.params.name);
    const { formFormatId = null, formPrintId = null } = req.body || {};
    const form = await Form.findOne({ tenantId: req.tenant, name });
    if (!form) return res.status(404).json({ error: 'Form not found' });

    if (formFormatId) {
      const ok = await FormFormat.findOne({ _id: formFormatId, tenantId: req.tenant });
      if (!ok) return res.status(400).json({ error: 'Invalid format template id' });
    }
    if (formPrintId) {
      const ok = await FormPrint.findOne({ _id: formPrintId, tenantId: req.tenant });
      if (!ok) return res.status(400).json({ error: 'Invalid print template id' });
    }

    form.formFormatId = formFormatId || null;
    form.formPrintId  = formPrintId  || null;
    await form.save();
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
