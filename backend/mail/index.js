// backend/mail/index.js
// zentrale Mail-Orchestrierung (nutzt ./transport für SMTP/Sendgrid)

const { sendMail: transportSend, verify } = require('./transport');

const MAIL_ENABLED = String(process.env.MAIL_ENABLED || 'false').toLowerCase() === 'true';
const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || 'http://localhost:5173';

let verified = false;

/** Beim Server-Start aufrufen (nicht blockierend) */
async function init() {
  if (!MAIL_ENABLED) {
    console.log('[mail] disabled via MAIL_ENABLED=false (DRY-RUN active)');
    return false;
  }
  try {
    const res = await verify();
    verified = !!res?.ok;
    if (verified) {
      console.log('[mail] ready (verify OK)');
    } else {
      console.warn('[mail] verify failed – sending may fail; will still attempt');
    }
  } catch (e) {
    console.warn('[mail] verify threw:', e.message);
  }
  return verified;
}

/** Einheitliche Versand-Funktion */
async function sendMail({ to, subject, text = '', html = '', cc, bcc, replyTo }) {
  if (!MAIL_ENABLED) {
    console.log('[mail] DRY-RUN (MAIL_ENABLED=false):', { to, subject });
    return { ok: false, dryRun: true, reason: 'MAIL_ENABLED=false' };
  }
  return transportSend({ to, subject, text, html, cc, bcc, replyTo });
}

/** --------- TEMPLATES --------- **/

/** Einladung: System-Admin */
function inviteSysAdminEmail({ email, displayName, tempPassword }) {
  const subject = '[MDXKit] Einladung als System-Administrator';

  const who = displayName || email;
  const text = `Hallo ${who},

du wurdest als System-Administrator eingeladen.

Login: ${APP_PUBLIC_URL}
E-Mail: ${email}
Temporäres Passwort: ${tempPassword}

Bitte melde dich an und ändere das Passwort sofort unter "Profil → Passwort ändern".
`;

  const html = `
  <p>Hallo ${escapeHtml(who)},</p>
  <p>du wurdest als <strong>System-Administrator</strong> eingeladen.</p>
  <p><b>Login:</b> <a href="${APP_PUBLIC_URL}">${APP_PUBLIC_URL}</a><br/>
     <b>E-Mail:</b> ${escapeHtml(email)}<br/>
     <b>Temporäres Passwort:</b> <code>${escapeHtml(tempPassword)}</code></p>
  <p>Bitte nach dem ersten Login sofort das Passwort ändern.</p>
  `;

  return { to: email, subject, text, html };
}

/** (Optional) Einladung: Tenant-Admin – schon mal vorbereitet */
function inviteTenantAdminEmail({ email, displayName, tempPassword, tenantName, tenantId }) {
  const subject = `[MDXKit] Einladung als Tenant-Admin (${tenantName || tenantId})`;
  const who = displayName || email;
  const url = `${APP_PUBLIC_URL}/tenant/${encodeURIComponent(tenantId)}`;
  const text = `Hallo ${who},

du wurdest als Tenant-Administrator für "${tenantName || tenantId}" eingeladen.

Login: ${url}
E-Mail: ${email}
Temporäres Passwort: ${tempPassword}

Bitte melde dich an und ändere das Passwort sofort.
`;
  const html = `
  <p>Hallo ${escapeHtml(who)},</p>
  <p>du wurdest als <strong>Tenant-Administrator</strong> für
     <strong>${escapeHtml(tenantName || tenantId)}</strong> eingeladen.</p>
  <p><b>Login:</b> <a href="${url}">${url}</a><br/>
     <b>E-Mail:</b> ${escapeHtml(email)}<br/>
     <b>Temporäres Passwort:</b> <code>${escapeHtml(tempPassword)}</code></p>
  <p>Bitte nach dem ersten Login sofort das Passwort ändern.</p>
  `;
  return { to: email, subject, text, html };
}

// backend/mail/index.js (Ausschnitt)
function inviteTenantUserEmail({ email, displayName, tenantName, tenantId, tempPassword, loginUrl }) {
  return {
    to: email,
    subject: `[MDXKit] Einladung (${tenantName || tenantId})`,
    text:
      `Hallo ${displayName || email},\n\n` +
      `Sie wurden für den Tenant "${tenantName || tenantId}" eingeladen.\n\n` +
      `Login: ${loginUrl}\n` +
      `Temporäres Passwort: ${tempPassword}\n\n` +
      `Bitte melden Sie sich an und ändern Sie Ihr Passwort.\n`,
    html:
      `<p>Hallo ${displayName || email},</p>` +
      `<p>Sie wurden für den Tenant <strong>${tenantName || tenantId}</strong> eingeladen.</p>` +
      `<p><strong>Login:</strong> <a href="${loginUrl}">${loginUrl}</a><br>` +
      `<strong>Temporäres Passwort:</strong> <code>${tempPassword}</code></p>` +
      `<p>Bitte melden Sie sich an und ändern Sie Ihr Passwort.</p>`,
  };
}

/** Simple HTML Escaper für Templates */
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  init,
  sendMail,
  inviteSysAdminEmail,
  inviteTenantAdminEmail,
  inviteTenantUserEmail
};
