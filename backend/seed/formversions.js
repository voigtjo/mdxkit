// seed/formversions.js
const mongoose = require('mongoose');
const FormVersion = require('../models/formVersion');
require('dotenv').config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Alle FormVersion-Dokumente updaten
    const result = await FormVersion.updateMany(
      {},
      { $set: { isGlobal: true, groupIds: [] } }
    );

    console.log(`✅ ${result.modifiedCount} Formulare wurden auf isGlobal=true gesetzt`);
    process.exit();
  } catch (err) {
    console.error('❌ Fehler beim Seeding:', err);
    process.exit(1);
  }
}

seed();
