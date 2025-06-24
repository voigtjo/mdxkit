// seed/patients.js
const mongoose = require('mongoose');
const Patient = require('../models/patient');
require('dotenv').config();

const patients = [
  { name: 'Anna Schmidt', email: 'anna.schmidt@example.com' },
  { name: 'Max Müller', email: 'max.mueller@example.com' },
  { name: 'Lena Bauer', email: 'lena.bauer@example.com' },
  { name: 'Tom Schulz', email: 'tom.schulz@example.com' },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await Patient.deleteMany();
    await Patient.insertMany(patients);
    console.log('✅ Patienten wurden eingefügt');
    process.exit();
  } catch (err) {
    console.error('Fehler beim Seeding:', err);
    process.exit(1);
  }
}

seed();
