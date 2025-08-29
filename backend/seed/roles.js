// seed/roles.js
const mongoose = require('mongoose');
const Role = require('../models/role');
require('dotenv').config();

const roles = [
  {
    key: 'FormAuthor',
    name: 'Form Author',
    description: 'Darf Formulare anlegen und bearbeiten',
    status: 'active',
  },
  {
    key: 'FormPublisher',
    name: 'Form Publisher',
    description: 'Darf Formulare veröffentlichen',
    status: 'active',
  },
  {
    key: 'Operator',
    name: 'Operator',
    description: 'Kann Formulare bedienen und Daten erfassen',
    status: 'active',
  },
  {
    key: 'FormDataEditor',
    name: 'Form Data Editor',
    description: 'Darf Formulardaten erfassen und ändern',
    status: 'active',
  },
  {
    key: 'FormDataApprover',
    name: 'Form Data Approver',
    description: 'Kann Formulardaten prüfen und freigeben',
    status: 'active',
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await Role.deleteMany(); // bestehende Rollen löschen
    await Role.insertMany(roles);

    console.log('✅ Rollen wurden eingefügt');
    process.exit();
  } catch (err) {
    console.error('Fehler beim Seeding:', err);
    process.exit(1);
  }
}

seed();
