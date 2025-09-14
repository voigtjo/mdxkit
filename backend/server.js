// backend/server.js
require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
// const helmet = require('helmet');

const authRoutes       = require('./routes/auth');
const { authRequired } = require('./middleware/auth');
const tenantFromParam  = require('./middleware/tenantFromParam');

// Routen
const tenantsPublicRoutes = require('./routes/tenants-public'); // /api/tenants (PUBLIC)
const sysTenantsRoutes    = require('./routes/sysTenants');     // /api/sys/tenants (SYSTEM)
const roleSysRoutes       = require('./routes/roles.sys');      // /api/sys/roles   (SYSTEM)
const sysUsersRoutes      = require('./routes/sysUsers');       // /api/sys/users   (SYSTEM)
const userInvitesRoutes = require('./routes/userInvites');

const adminRoutes   = require('./routes/admin');                 // /api/tenant/:tenantId/admin
const manageRoutes  = require('./routes/manage');                // /api/tenant/:tenantId/manage
const formRoutes    = require('./routes/form');                  // /api/tenant/:tenantId/form
const usersRoutes   = require('./routes/users');                 // /api/tenant/:tenantId/users
const groupRoutes   = require('./routes/groups');                // /api/tenant/:tenantId/groups

// backend/server.js
const sysAdminsRouter = require('./routes/sysAdmins');
const sysTenantAdminsRoutes = require('./routes/sysTenantAdmins');
const sysTestMail = require('./routes/sysTestMail');

const app   = express();
const isProd = process.env.NODE_ENV === 'production';
const PORT  = Number(process.env.PORT) || 5001;

/* ---------------------- Global Middleware ---------------------- */
app.set('trust proxy', 1);

// CORS: Prod -> aus CORS_ORIGIN (kommagetrennt); Dev -> Default-Whitelist
const defaultDevOrigins = [
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:3000', 'http://127.0.0.1:3000',
];

const envOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const allowedOrigins = envOrigins.length ? envOrigins : (isProd ? [] : defaultDevOrigins);

// Optional: in Dev anzeigen
if (!isProd) console.log('[CORS] Allowed origins:', allowedOrigins);

app.use(cors({
  origin(origin, cb) {
    // ohne Origin (curl/Postman/SSR) erlauben
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// ─── Mail-Orchestrator (./mail) einmal initialisieren (nicht blockierend) ────
try {
  const mail = require('./mail');
  mail.init().catch(() => {});
} catch (e) {
  console.warn('[mail] init skipped:', e.message);
}


/* ---------------------- Auth ---------------------- */
app.use('/api/auth', authRoutes);

/* ---------------------- Health ---------------------- */
// Text-Variante (war bereits da)
app.get('/health', (_req, res) => res.status(200).send('ok'));

// JSON-Variante (für Monitoring / Smoke-Tests)
app.get('/api/health', (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1 ? 'up' : 'down';
  const mailEnabled = String(process.env.MAIL_ENABLED).toLowerCase() === 'true';
  res.json({
    ok: true,
    env: process.env.NODE_ENV || 'development',
    db: dbReady,
    mail: { enabled: mailEnabled },
    time: new Date().toISOString(),
  });
});

// System-Testroute (z. B. Mail)
app.use('/api/sys', /* authRequired, */ sysTestMail);

app.use('/api/sys/admins', sysAdminsRouter);

/* ---------------------- PUBLIC (no tenant) ---------------------- */
app.use('/api/tenants', tenantsPublicRoutes);

/* ---------------------- SYSTEM (no tenant) ---------------------- */
app.use('/api/sys/tenants', sysTenantsRoutes);
app.use('/api/sys/tenants', sysTenantAdminsRoutes);
app.use('/api/sys/roles',   roleSysRoutes);
app.use('/api/sys/users',   sysUsersRoutes);

/* ---------------------- TENANT-SCOPE ---------------------- */
// Reihenfolge: erst tenantFromParam (resolv’t :tenantId → req.tenant (ObjectId) & ggf. req.tenantPublicId),
// dann authRequired.
app.use('/api/tenant/:tenantId/admin',  tenantFromParam, authRequired, adminRoutes);
app.use('/api/tenant/:tenantId/groups', tenantFromParam, authRequired, groupRoutes);
app.use('/api/tenant/:tenantId/manage', tenantFromParam, authRequired, manageRoutes);
app.use('/api/tenant/:tenantId/form',   tenantFromParam, authRequired, formRoutes);
app.use('/api/tenant/:tenantId/users',  tenantFromParam, authRequired, usersRoutes);
app.use('/api/tenant/:tenantId/users', tenantFromParam, authRequired, userInvitesRoutes);

/* ---------------------- 404 & Error Handling ---------------------- */
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

/* ---------------------- DB + Start ---------------------- */
// In Prod MUSS MONGO_URI gesetzt sein; in Dev fallback auf Local
const mongoUri =
  process.env.MONGO_URI ||
  (!isProd ? 'mongodb://localhost:27017/markdown-extended' : null);

if (!mongoUri) {
  console.error('MONGO_URI is not set (production)');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
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
