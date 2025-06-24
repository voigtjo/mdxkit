const express = require('express');
const router = express.Router();
const Patient = require('../models/patient');

// Vorhanden: alle Patienten laden
router.get('/', async (req, res) => {
  const patients = await Patient.find();
  res.json(patients);
});

// ✅ Neu: einzelner Patient per ID
router.get('/:id', async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient nicht gefunden' });
  res.json(patient);
});

module.exports = router;
