require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// Optional: const helmet = require('helmet');

const tenantResolver = require('./middleware/tenant');

const adminRoutes = require('./routes/admin');
const manageRoutes = require('./routes/manage');
const formRoutes = require('./routes/form'); // statt './routes/user'
const usersRoutes = require('./routes/users');      // 🆕
const adminFormats = require('./routes/adminFormats');
const adminPrints = require('./routes/adminPrints');
const tenantFromParam = require('./middleware/tenantFromParam');
const tenantsPublicRoutes = require('./routes/tenants-public');
const sysTenantsRoutes    = require('./routes/sysTenants'); 

const app = express();
const PORT = process.env.PORT || 5000;

// --- Global middleware ---
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '10mb' }));


// Health check (ohne Tenant)
app.get('/health', (_req, res) => res.status(200).send('ok'));

app.use('/api/tenants', tenantsPublicRoutes);
app.use('/api/sys/tenants', sysTenantsRoutes);
// --- Tenant-Resolver für alle /api-* Routen ---
// Falls du später *öffentliche* API-Endpunkte brauchst (z. B. Login),
// mounte die VOR dieser Zeile oder hänge sie direkt auf /public.
app.use('/api', tenantResolver);

// NEU: URL-basierter Tenant-Scope
app.use('/api/tenant/:tenantId/admin',  tenantFromParam, adminRoutes);
app.use('/api/tenant/:tenantId/manage', tenantFromParam, manageRoutes);
app.use('/api/tenant/:tenantId/form',   tenantFromParam, formRoutes);  // ✅ statt /user
app.use('/api/tenant/:tenantId/users', tenantFromParam, usersRoutes); // ✅ richtig
app.use('/api/tenant/:tenantId/admin/formats', tenantFromParam, adminFormats);
app.use('/api/tenant/:tenantId/admin/prints',  tenantFromParam, adminPrints);

// 404-Fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Zentrale Error-Handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// --- DB + Start ---
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not set'); process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, {
  // Hinweis: useNewUrlParser/useUnifiedTopology sind bei neueren Mongoose-Versionen nicht mehr nötig,
  // schaden aber nicht. Du kannst sie weglassen, wenn du Mongoose >= 7 nutzt.
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Graceful shutdown (optional, aber empfehlenswert)
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await mongoose.connection.close();
  process.exit(0);
});
