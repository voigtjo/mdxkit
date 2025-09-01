// backend/server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// const helmet = require('helmet');

const authRoutes       = require('./routes/auth');
const { authRequired } = require('./middleware/auth');
const tenantFromParam  = require('./middleware/tenantFromParam');

// Routen
const tenantsPublicRoutes = require('./routes/tenants-public'); // /api/tenants (PUBLIC)
const sysTenantsRoutes    = require('./routes/sysTenants');     // /api/sys/tenants (SYSTEM)
const roleSysRoutes       = require('./routes/roles.sys');      // /api/sys/roles   (SYSTEM)
const sysUsersRoutes      = require('./routes/sysUsers');       // /api/sys/users   (SYSTEM)

const adminRoutes   = require('./routes/admin');                 // /api/tenant/:tenantId/admin
const manageRoutes  = require('./routes/manage');                // /api/tenant/:tenantId/manage
const formRoutes    = require('./routes/form');                  // /api/tenant/:tenantId/form
const usersRoutes   = require('./routes/users');                 // /api/tenant/:tenantId/users
const groupRoutes   = require('./routes/groups');                // /api/tenant/:tenantId/groups
const adminFormats  = require('./routes/adminFormats');          // /api/tenant/:tenantId/admin/formats
const adminPrints   = require('./routes/adminPrints');           // /api/tenant/:tenantId/admin/prints

const app  = express();
const PORT = process.env.PORT || 5000;

/* ---------------------- Global Middleware ---------------------- */
app.set('trust proxy', 1);
app.use(cors());
// app.use(helmet());
app.use(express.json({ limit: '10mb' }));

/* ---------------------- Auth ---------------------- */
app.use('/api/auth', authRoutes);

/* ---------------------- Health ---------------------- */
app.get('/health', (_req, res) => res.status(200).send('ok'));

/* ---------------------- PUBLIC (no tenant) ---------------------- */
app.use('/api/tenants', tenantsPublicRoutes);

/* ---------------------- SYSTEM (no tenant) ---------------------- */
app.use('/api/sys/tenants', sysTenantsRoutes);
app.use('/api/sys/roles',   roleSysRoutes);
app.use('/api/sys/users',   sysUsersRoutes);

/* ---------------------- TENANT-SCOPE ---------------------- */
// WICHTIG: Nur parametrisierte Routen mounten, kein zusätzliches /api/tenant davor.
// Reihenfolge: erst tenantFromParam (setzt req.tenantId), dann authRequired.
app.use('/api/tenant/:tenantId/admin',          tenantFromParam, authRequired, adminRoutes);
app.use('/api/tenant/:tenantId/groups',         tenantFromParam, authRequired, groupRoutes);
app.use('/api/tenant/:tenantId/manage',         tenantFromParam, authRequired, manageRoutes);
app.use('/api/tenant/:tenantId/form',           tenantFromParam, authRequired, formRoutes);
app.use('/api/tenant/:tenantId/users',          tenantFromParam, authRequired, usersRoutes);
app.use('/api/tenant/:tenantId/admin/formats',  tenantFromParam, authRequired, adminFormats);
app.use('/api/tenant/:tenantId/admin/prints',   tenantFromParam, authRequired, adminPrints);

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
