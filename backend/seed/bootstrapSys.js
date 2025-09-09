// backend/seed/bootstrapSys.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Tenant = require('../models/tenant');
const User   = require('../models/user');
const Role   = require('../models/role');

function makeUid(prefix = 'rol') {
  const rnd = Math.random().toString(36).slice(2, 10);
  const ts  = Date.now().toString(36);
  return `${prefix}_${ts}${rnd}`;
}

(async function main() {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/markdown-extended';
    await mongoose.connect(MONGO_URI, {});
    console.log('[seed] Connected to', MONGO_URI);

    // --- ENV Parameter ---
    const SYS_TENANT_KEY  = process.env.SEED_SYS_TENANT_KEY  || 'sys';
    const SYS_TENANT_NAME = process.env.SEED_SYS_TENANT_NAME || 'System';
    const ADMIN_EMAIL     = (process.env.SEED_SYSADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
    const ADMIN_NAME      = process.env.SEED_SYSADMIN_NAME || 'System Administrator';
    const ADMIN_PASSWORD  = process.env.SEED_SYSADMIN_PASSWORD || 'changeme123';
    const FORCE_RESET     = String(process.env.SEED_FORCE_RESET || 'false').toLowerCase() === 'true';

    // --- (A) Index-Safety für Rollen: unique + sparse auf roleId ---
    try {
      const idxes = await mongoose.connection.db.collection('roles').indexes();
      const hasRoleIdIdx = idxes.some(i => i.name === 'roleId_1');
      if (hasRoleIdIdx) {
        // falls existiert, prüfen ob sparse; wenn nicht, droppen & neu
        const meta = idxes.find(i => i.name === 'roleId_1');
        if (!meta.sparse || !meta.unique) {
          console.log('[seed] Recreating roleId index as unique+sparse');
          await mongoose.connection.db.collection('roles').dropIndex('roleId_1');
          await mongoose.connection.db.collection('roles').createIndex({ roleId: 1 }, { unique: true, sparse: true });
        }
      } else {
        await mongoose.connection.db.collection('roles').createIndex({ roleId: 1 }, { unique: true, sparse: true });
      }
    } catch (e) {
      console.warn('[seed] Index ensure warning (roles.roleId):', e.message);
    }

    // --- (B) System-Tenant anlegen/reaktivieren ---
    let tenant =
      (await Tenant.findOne({ key: SYS_TENANT_KEY })) ||
      (await Tenant.findOne({ tenantId: SYS_TENANT_KEY }));
    if (!tenant) {
      tenant = await Tenant.create({
        key: SYS_TENANT_KEY,
        tenantId: SYS_TENANT_KEY,
        name: SYS_TENANT_NAME,
        status: 'active',
      });
      console.log('[seed] Created system tenant:', SYS_TENANT_KEY);
    } else {
      if (tenant.status !== 'active') {
        tenant.status = 'active';
        await tenant.save();
      }
      console.log('[seed] Using system tenant:', SYS_TENANT_KEY);
    }

    // --- (C) Basis-Rollen sicherstellen (ohne Upsert) ---
    const baseRoles = [
      { key: 'FormAuthor',       name: 'Form Author' },
      { key: 'FormPublisher',    name: 'Form Publisher' },
      { key: 'Operator',         name: 'Operator' },
      { key: 'FormDataEditor',   name: 'Form Data Editor' },
      { key: 'FormDataApprover', name: 'Form Data Approver' },
    ];

    for (const r of baseRoles) {
      let role = await Role.findOne({ key: r.key });
      if (!role) {
        role = new Role({
          key: r.key,
          name: r.name,
          status: 'active',
        });
        // Falls dein withUid-Plugin nicht bei create() greift, Fallback:
        if (!role.roleId) role.roleId = makeUid('rol');
        await role.save();
        console.log('[seed] Created role:', r.key, '→', role.roleId);
      } else {
        let changed = false;
        if (role.status !== 'active') { role.status = 'active'; changed = true; }
        if (!role.name) { role.name = r.name; changed = true; }
        if (!role.roleId) { role.roleId = makeUid('rol'); changed = true; }
        if (changed) {
          await role.save();
          console.log('[seed] Updated role:', r.key);
        }
      }
    }

    // --- (D) SysAdmin-User anlegen/aktualisieren ---
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    let admin = await User.findOne({ tenant: tenant._id, email: ADMIN_EMAIL });
    if (!admin) {
      admin = await User.create({
        tenant: tenant._id,
        displayName: ADMIN_NAME,
        email: ADMIN_EMAIL,
        status: 'active',
        isSystemAdmin: true,
        isTenantAdmin: false,
        memberships: [],
        defaultGroupId: null,
        passwordHash,
        tokenVersion: 0,
      });
      console.log('[seed] Created sysadmin:', ADMIN_EMAIL);
    } else {
      let changed = false;
      if (!admin.isSystemAdmin) { admin.isSystemAdmin = true; changed = true; }
      if (admin.status !== 'active') { admin.status = 'active'; changed = true; }
      if (FORCE_RESET || !admin.passwordHash) { admin.passwordHash = passwordHash; changed = true; }
      if (changed) {
        await admin.save();
        console.log('[seed] Updated sysadmin');
      } else {
        console.log('[seed] Sysadmin already up-to-date');
      }
    }

    console.log('---');
    console.log('Login:');
    console.log('  Email   :', ADMIN_EMAIL);
    console.log('  Passwort:', ADMIN_PASSWORD);
    console.log('Hinweis: Login benötigt KEINE tenantId.');
    console.log('---');
    console.log('[seed] Done ✅');
  } catch (err) {
    console.error('[seed] Failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
