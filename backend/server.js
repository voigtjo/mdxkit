// backend/server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// Optional hart machen, wenn gewünscht:
// const helmet = require('helmet');

const tenantResolver   = require('./middleware/tenant');        // liest x-tenant-id o.ä.
const tenantFromParam  = require('./middleware/tenantFromParam');

// Routen
const tenantsPublicRoutes = require('./routes/tenants-public'); // /api/tenants (PUBLIC)
const sysTenantsRoutes    = require('./routes/sysTenants');     // /api/sys/tenants (SYSTEM)
const roleSysRoutes       = require('./routes/roles.sys');      // /api/sys/roles   (SYSTEM)

const adminRoutes   = require('./routes/admin');                 // /api/tenant/:tenantId/admin
const manageRoutes  = require('./routes/manage');                // /api/tenant/:tenantId/manage
const formRoutes    = require('./routes/form');                  // /api/tenant/:tenantId/form
const usersRoutes   = require('./routes/users');                 // /api/tenant/:tenantId/users
const groupRoutes   = require('./routes/groups');                // /api/tenant/:tenantId/groups
const adminFormats  = require('./routes/adminFormats');          // /api/tenant/:tenantId/admin/formats
const adminPrints   = require('./routes/adminPrints');           // /api/tenant/:tenantId/admin/prints

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------------------- Global Middleware ---------------------- */
app.set('trust proxy', 1);
app.use(cors());
// app.use(helmet());
app.use(express.json({ limit: '10mb' }));

/* ---------------------- Health ---------------------- */
app.get('/health', (_req, res) => res.status(200).send('ok'));

/* ---------------------- PUBLIC (kein Tenant) ---------------------- */
// ⚠️ Diese Routen dürfen NICHT durch tenantResolver laufen
app.use('/api/tenants', tenantsPublicRoutes);   // z. B. für TenantSwitcher

/* ---------------------- SYSTEM (kein Tenant) ---------------------- */
// ⚠️ Ebenfalls VOR dem tenantResolver mounten
app.use('/api/sys/tenants', sysTenantsRoutes);
app.use('/api/sys/roles',   roleSysRoutes);

/* ---------------------- TENANT-SCOPE ---------------------- */
// Ab hier nur noch /api/tenant/* vom Resolver prüfen lassen
// -> schützt tenantisierte APIs und stellt req.tenantId/Context bereit
app.use('/api/tenant', tenantResolver);

// URL-basierter Tenant-Scope (liest :tenantId in req.tenantId o.ä.)
app.use('/api/tenant/:tenantId/admin',          tenantFromParam, adminRoutes);
app.use('/api/tenant/:tenantId/groups',         tenantFromParam, groupRoutes);
app.use('/api/tenant/:tenantId/manage',         tenantFromParam, manageRoutes);
app.use('/api/tenant/:tenantId/form',           tenantFromParam, formRoutes);
app.use('/api/tenant/:tenantId/users',          tenantFromParam, usersRoutes);
app.use('/api/tenant/:tenantId/admin/formats',  tenantFromParam, adminFormats);
app.use('/api/tenant/:tenantId/admin/prints',   tenantFromParam, adminPrints);

/* ---------------------- 404 & Error Handling ---------------------- */
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

/* ---------------------- DB + Start ---------------------- */
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not set');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, {
  // Bei Mongoose >= 7 nicht mehr nötig, schadet aber nicht:
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});
