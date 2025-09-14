// backend/routes/userInvites.js
const express = require('express');
const router = express.Router({ mergeParams: true });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');

const User = require('../models/user');

const { authRequired } = require('../middleware/auth');
const { requireRoles } = require('../middleware/authz');
const tenantFromParam = require('../middleware/tenantFromParam');

const mail = require('../mail');

// Nur eingeloggte + TenantAdmin dürfen einladen
router.use(tenantFromParam, authRequired, requireRoles('TenantAdmin'));

/** random Temp-Passwort */
function randomPwd(len = 14) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/**
 * POST /api/tenant/:tenantId/users/:userId/invite
 * – setzt temp. Passwort + mustChangePassword
 * – aktualisiert invitedAt
 * – sendet Einladung per Mail (über ./mail)
 */
router.post('/:userId/invite', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const tenant = req.tenant; // aus tenantFromParam

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    const user = await User.findOne({ _id: userId, tenant: tenant._id }).lean();
    if (!user) return res.status(404).json({ error: 'User nicht gefunden' });
    if (!user.email) return res.status(400).json({ error: 'User hat keine E-Mail-Adresse' });

    const tempPassword = randomPwd(12);

    // Passwort setzen (Schema-Methode bevorzugt)
    if (typeof User.prototype.setPassword === 'function') {
      await User.updateOne({ _id: user._id }, {
        $set: {
          mustChangePassword: true,
          invitedAt: new Date(),
        }
      });
      const uDoc = await User.findById(user._id);
      await uDoc.setPassword(tempPassword);
      uDoc.mustChangePassword = true;
      uDoc.invitedAt = new Date();
      await uDoc.save();
    } else {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(tempPassword, salt);
      await User.updateOne({ _id: user._id }, {
        $set: {
          passwordHash: hash,
          mustChangePassword: true,
          invitedAt: new Date(),
        }
      });
    }

    const loginUrl =
      process.env.APP_PUBLIC_URL ||
      process.env.APP_BASE_URL ||
      'http://localhost:5173';

    // Payload über mail-Orchestrator (falls vorhanden), sonst Fallback
    const payload =
      mail && typeof mail.inviteTenantUserEmail === 'function'
        ? mail.inviteTenantUserEmail({
            email: user.email,
            displayName: user.displayName || user.email,
            tenantName: tenant.name || tenant.tenantId || '',
            tenantId: tenant.tenantId || '',
            tempPassword,
            loginUrl,
          })
        : {
            to: user.email,
            subject: `[MDXKit] Einladung für Ihren Zugang`,
            text:
              `Hallo ${user.displayName || user.email},\n\n` +
              `Sie wurden für den Tenant "${tenant.name || tenant.tenantId}" eingeladen.\n\n` +
              `Login: ${loginUrl}\n` +
              `Temporäres Passwort: ${tempPassword}\n\n` +
              `Bitte melden Sie sich an und ändern Sie Ihr Passwort.\n`,
            html:
              `<p>Hallo ${user.displayName || user.email},</p>` +
              `<p>Sie wurden für den Tenant <strong>${tenant.name || tenant.tenantId}</strong> eingeladen.</p>` +
              `<p><strong>Login:</strong> <a href="${loginUrl}">${loginUrl}</a><br>` +
              `<strong>Temporäres Passwort:</strong> <code>${tempPassword}</code></p>` +
              `<p>Bitte melden Sie sich an und ändern Sie Ihr Passwort.</p>`,
          };

    // High-Level-Logging rund um den Versand
    console.log('[invite:user] start', { userId: String(user._id), email: user.email, tenant: tenant.tenantId });

    let result;
    try {
    if (mail && typeof mail.sendMail === 'function') {
        result = await mail.sendMail(payload);
    } else {
        const transport = require('../mail/transport');
        result = await transport.sendMail(payload);
    }
    if (result?.dryRun) {
        console.log('[invite:user] DRY-RUN (MAIL_ENABLED=false):', { to: user.email });
    } else {
        console.log('[invite:user] sent', {
        to: user.email,
        messageId: result?.messageId,
        accepted: result?.accepted,
        response: result?.response
        });
    }
    } catch (sendErr) {
    console.error('[invite:user] send FAIL:', sendErr.message);
    return res.status(500).json({ error: 'Mailversand fehlgeschlagen' });
    }

    // invitedAt zur Antwort (Display in UI)
    const updated = await User.findById(user._id, 'email invitedAt').lean();
    res.json({ ok: true, email: updated.email, invitedAt: updated.invitedAt });

  } catch (e) { next(e); }
});

module.exports = router;
