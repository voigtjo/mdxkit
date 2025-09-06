// backend/mail/transport.js
// zentraler Switch zwischen Providern – Default: SMTP (STRATO)
const WHICH = (process.env.MAIL_PROVIDER || 'smtp').toLowerCase();

let impl;
switch (WHICH) {
  case 'smtp':
    impl = require('./smtp');      // STRATO SMTP
    break;
  case 'sendgrid':
    impl = require('./sendgrid');  // dein vorhandener SendGrid-Helper
    break;
  // optional: weitere Provider (postmark, ses, ...)
  default:
    console.warn(`[Mail] Unknown MAIL_PROVIDER='${WHICH}', falling back to SMTP`);
    impl = require('./smtp');
}

module.exports = impl;
