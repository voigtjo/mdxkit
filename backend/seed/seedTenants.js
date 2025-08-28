// node backend/scripts/seedTenants.js "mongodb://localhost:27017/yourdb"
const mongoose = require('mongoose');
const Tenant = require('../models/tenant');

(async () => {
  const uri = process.argv[2];
  if (!uri) { console.error('MONGO URI fehlt'); process.exit(1); }
  await mongoose.connect(uri);
  const base = [
    { tenantId: 'dev',  name: 'Development' },
    { tenantId: 'demo', name: 'Demo Mandant' },
    { tenantId: 'test', name: 'Test Mandant' },
  ];
  for (const t of base) {
    await Tenant.updateOne({ tenantId: t.tenantId }, { $setOnInsert: t }, { upsert: true });
  }
  console.log('Tenants seeded.');
  await mongoose.disconnect();
})();
