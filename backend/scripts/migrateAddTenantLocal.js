// backend/scripts/migrateAddTenantLocal.js
// Usage:
//   node backend/scripts/migrateAddTenantLocal.js --tenant dev [--uri "mongodb://127.0.0.1:27017/markdown-extended"] [--create-indexes] [--seed-tenant] [--dry-run]
//
// Empfohlene erste Ausführung: --dry-run
// Danach: ohne --dry-run + ggf. --create-indexes --seed-tenant

const mongoose = require('mongoose');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { uri: 'mongodb://127.0.0.1:27017/markdown-extended', dryRun: false, createIndexes: false, seedTenant: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--uri') out.uri = args[++i];
    else if (a === '--tenant') out.tenant = args[++i];
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--create-indexes') out.createIndexes = true;
    else if (a === '--seed-tenant') out.seedTenant = true;
  }
  if (!out.tenant) {
    console.error('❌ Bitte --tenant <TENANT_ID> angeben (z. B. dev)');
    process.exit(1);
  }
  return out;
}

async function main() {
  const { uri, tenant, dryRun, createIndexes, seedTenant } = parseArgs();
  console.log(`🔗 Verbinde zu: ${uri}`);
  await mongoose.connect(uri);

  const db = mongoose.connection.db;

  // Vorhandene Collections ermitteln
  const collections = (await db.listCollections().toArray()).map(c => c.name);

  // Deine erwarteten Collections (ggf. anpassen, falls Namensabweichungen):
  const target = [
    'forms',
    'formversions',
    'formdatas',
    'formtestdatas',
    'formformats',
    'formprints',
    'patients',
    // optional:
    'tenants',
  ].filter(name => collections.includes(name));

  console.log('📚 Collections:', target.join(', '));

  // 1) tenantId setzen, wo fehlt
  for (const colName of target) {
    const col = db.collection(colName);
    const missingCount = await col.countDocuments({ tenantId: { $exists: false } });
    console.log(`➡️ ${colName}: ${missingCount} Dokument(e) ohne tenantId`);
    if (!dryRun && missingCount > 0) {
      const res = await col.updateMany(
        { tenantId: { $exists: false } },
        { $set: { tenantId: tenant } }
      );
      console.log(`   ✅ gesetzt: ${res.modifiedCount}`);
    }
  }

  // 2) Indizes (nur wenn gewünscht)
  if (createIndexes) {
    console.log('🔧 Erstelle/aktualisiere Indizes…');

    async function safeIndex(col, spec, opts) {
      try {
        await db.collection(col).createIndex(spec, opts);
        console.log(`   ✅ ${col} index`, spec, opts || {});
      } catch (e) {
        console.warn(`   ⚠️ ${col} index Fehler:`, e.message);
      }
    }

    await safeIndex('forms', { tenantId: 1, name: 1 }, { unique: true });

    await safeIndex('formversions', { tenantId: 1, name: 1, version: 1 }, { unique: true });
    await safeIndex('formversions', { tenantId: 1, name: 1, valid: 1 }, { unique: true, partialFilterExpression: { valid: true } });

    await safeIndex('formdatas', { tenantId: 1, formName: 1, patientId: 1 });

    await safeIndex('formtestdatas', { tenantId: 1, formName: 1, version: 1 });

    await safeIndex('formformats', { tenantId: 1, name: 1 }, { unique: true });

    await safeIndex('formprints', { tenantId: 1, name: 1 }, { unique: true });

    // patients: email pro Tenant optional unique
    await safeIndex('patients', { tenantId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });

    // tenants: unique auf tenantId
    if (collections.includes('tenants')) {
      await safeIndex('tenants', { tenantId: 1 }, { unique: true });
      await safeIndex('tenants', { status: 1 });
    }
  }

  // 3) (Optional) Tenant-Datensatz anlegen
  if (seedTenant) {
    const tenants = db.collection('tenants');
    const exists = await tenants.findOne({ tenantId: tenant });
    if (exists) {
      console.log(`ℹ️ Tenant ${tenant} existiert bereits (status=${exists.status || 'unknown'})`);
    } else if (!dryRun) {
      await tenants.insertOne({
        tenantId: tenant,
        name: tenant === 'dev' ? 'Development' : tenant,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`   ✅ Tenant ${tenant} angelegt (active)`);
    }
  }

  await mongoose.disconnect();
  console.log('🏁 Fertig.');
}

main().catch(e => {
  console.error('❌ Migration fehlgeschlagen:', e);
  process.exit(1);
});
