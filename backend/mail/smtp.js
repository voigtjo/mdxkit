// backend/mail/smtp.js
const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT = '587',
  SMTP_SECURE = 'false',           // 'true' nur bei Port 465 (SMTPS)
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
  SMTP_DEBUG = 'false',            // bei Bedarf auf 'true' setzen
} = process.env;

const secure = String(SMTP_SECURE).toLowerCase() === 'true';
const portNum = Number(SMTP_PORT || 587);

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: portNum,
  secure,                          // 465:true, 587:false (STARTTLS)
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  logger: String(SMTP_DEBUG).toLowerCase() === 'true',
  debug:  String(SMTP_DEBUG).toLowerCase() === 'true',
});

// kompaktes Boot-Log (ohne Passwörter)
console.log('[SMTP:init]', {
  host: SMTP_HOST,
  port: portNum,
  secure,
  user: SMTP_USER || '(none)',
});

// optional DNS-Auflösung loggen, wenn SMTP_DEBUG=true
if (String(SMTP_DEBUG).toLowerCase() === 'true') {
  const dns = require('dns').promises;
  dns.lookup(SMTP_HOST).then(ip =>
    console.log('[SMTP:dns]', SMTP_HOST, '→', ip.address)
  ).catch(e =>
    console.warn('[SMTP:dns] lookup failed:', e.message)
  );
}

// verifizierbarer Check – kannst du beim Start aufrufen
async function verify() {
  try {
    await transporter.verify();
    console.log('[SMTP:verify] OK (server reachable & creds format plausible)');
    return { ok: true };
  } catch (e) {
    // typische Fehler klar ausdrücken
    console.error('[SMTP:verify] FAIL:', e.code || e.name || '', e.message);
    return { ok: false, error: `${e.code || e.name || 'ERR'}: ${e.message}` };
  }
}

async function sendMail({ to, subject, text = '', html = '', cc, bcc, replyTo }) {
  if (!EMAIL_FROM) throw new Error('EMAIL_FROM not set');

  // schlanker Send-Log
  console.log('[SMTP:send] →', {
    toCount: Array.isArray(to) ? to.length : 1,
    subject,
  });

  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      text,
      html,
      cc,
      bcc,
      replyTo,
    });

    console.log('[SMTP:send] ←', {
      messageId: info.messageId,
      accepted: info.accepted,
      response: info.response, // z.B. '250 OK id=...'
    });

    return { ok: true, messageId: info.messageId, accepted: info.accepted, response: info.response };
  } catch (e) {
    // Klartext-Fehler – z. B. ECONNREFUSED/ETIMEDOUT/EAUTH/ENOTFOUND
    console.error('[SMTP:error]', e.code || e.name || '', e.message);
    throw e;
  }
}

module.exports = { sendMail, verify };
