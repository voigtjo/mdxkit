const express = require('express');
const router = express.Router();
const Tenant = require('../models/tenant');
const { requireSystemAdmin } = require('../middleware/sysAuth');

// Liste aller Tenants (inkl. suspended)
router.get('/', requireSystemAdmin, async (_req, res) => {
  try {
    const list = await Tenant.find({}).sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Anlegen
router.post('/', requireSystemAdmin, async (req, res) => {
  try {
    const { tenantId, name, settings } = req.body;
    if (!tenantId || !name) return res.status(400).json({ error: 'tenantId und name erforderlich' });

    // einfache Validierung
    if (!/^[a-zA-Z0-9_-]{2,64}$/.test(tenantId)) {
      return res.status(400).json({ error: 'Ungültige tenantId (a–Z, 0–9, _ , -, 2–64)' });
    }

    const t = await Tenant.create({ tenantId, name, settings: settings || {} });
    res.json({ success: true, id: t._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Status ändern (suspend/activate)
router.patch('/:tenantId/status', requireSystemAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { status } = req.body; // 'active' | 'suspended'
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'status muss active|suspended sein' });
    }
    const updated = await Tenant.findOneAndUpdate({ tenantId }, { status }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Tenant nicht gefunden' });
    res.json({ success: true, tenant: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// (Optional) Löschen – Vorsicht in Produktion!
router.delete('/:tenantId', requireSystemAdmin, async (req, res) => {
  try {
    const deleted = await Tenant.findOneAndDelete({ tenantId: req.params.tenantId });
    if (!deleted) return res.status(404).json({ error: 'Tenant nicht gefunden' });
    // Achtung: hier NICHT die tenant‑Daten löschen – dafür separater Prozess/Migration!
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
