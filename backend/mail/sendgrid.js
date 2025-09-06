// backend/mail/sendgrid.js
const sg = require('@sendgrid/mail');
const sgClient = require('@sendgrid/client');

const MAIL_ENABLED = String(process.env.MAIL_ENABLED || '').toLowerCase() === 'true';
const FROM = process.env.EMAIL_FROM;
const REQ_REGION = (process.env.SENDGRID_REGION || '').toLowerCase(); // '', 'eu'
let BASE_URL = process.env.SENDGRID_BASE_URL || (REQ_REGION === 'eu'
  ? 'https://api.eu.sendgrid.com'
  : 'https://api.sendgrid.com');

let HAS_KEY = false;

function initClient(baseUrl) {
  BASE_URL = baseUrl;
  if (!process.env.SENDGRID_API_KEY) return;
  sg.setApiKey(process.env.SENDGRID_API_KEY);
  sgClient.setApiKey(process.env.SENDGRID_API_KEY);
  sgClient.setDefaultRequest({ baseUrl: baseUrl });
  sg.setClient(sgClient);
  HAS_KEY = true;
  console.log('[Mail:init]', {
    enabled: MAIL_ENABLED, hasKey: HAS_KEY, from: FROM, baseUrl: BASE_URL
  });
}

initClient(BASE_URL);

/**
 * sendMail({ to, subject, text?, html?, cc?, bcc?, replyTo? })
 */
async function sendMail({ to, subject, text = '', html = '', cc, bcc, replyTo }) {
  if (!FROM) throw new Error('EMAIL_FROM not set');

  const msg = { to, from: FROM, subject, text, html };
  if (cc) msg.cc = cc;
  if (bcc) msg.bcc = bcc;
  if (replyTo) msg.replyTo = replyTo;

  if (!MAIL_ENABLED || !HAS_KEY) {
    console.log('[Mail:DRYRUN]', { toCount: Array.isArray(to) ? to.length : 1, subject });
    return { dryRun: true };
  }

  console.log('[Mail:send] →', { toCount: Array.isArray(to) ? to.length : 1, subject });

  try {
    const [resp] = await sg.send(msg);
    const id = resp?.headers?.['x-message-id'] || resp?.headers?.['x-message-id'.toLowerCase()];
    console.log('[Mail:send] ←', { status: resp?.statusCode, id });
    return { ok: true, status: resp?.statusCode || 0, id: id || null };
  } catch (err) {
    const reason =
      err?.response?.body?.errors?.[0]?.message ||
      err?.message ||
      String(err);

    // Region-Fehler? → Einmalig auf US-Endpunkt umschalten und retry
    const isRegionAuthError = /regional attribute/i.test(reason) || err?.code === 403;
    const isEU = BASE_URL.includes('api.eu.sendgrid.com');

    if (isRegionAuthError && isEU) {
      console.warn('[Mail:region-fallback] EU endpoint refused; retrying via US endpoint…');
      initClient('https://api.sendgrid.com');
      const [resp2] = await sg.send(msg);
      const id2 = resp2?.headers?.['x-message-id'] || resp2?.headers?.['x-message-id'.toLowerCase()];
      console.log('[Mail:send] ← (fallback US)', { status: resp2?.statusCode, id: id2 });
      return { ok: true, status: resp2?.statusCode || 0, id: id2 || null, fallback: 'us' };
    }

    console.error('[Mail:error]', reason);
    throw err;
  }
}

module.exports = { sendMail };
