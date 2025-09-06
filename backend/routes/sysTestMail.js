const express = require('express');
const router = express.Router();
const { sendMail } = require('../mail/transport'); // bleibt so

router.post('/test-mail', async (req, res) => {
  const { to, subject, text, html } = req.body || {};
  const _to = to || 'voigtjo@joevoi.com';
  const _subject = subject || 'SMTP Test (STRATO)';
  const _text = text || 'Nur Text – Test';

  console.log('[TEST-MAIL] →', { to: _to, subject: _subject });

  try {
    const r = await sendMail({ to: _to, subject: _subject, text: _text, html });
    console.log('[TEST-MAIL] ←', r);
    res.json({ ok: true, result: r });
  } catch (e) {
    const msg = e?.message || 'Mail send failed';
    console.error('[TEST-MAIL] ✖', msg);
    res.status(500).json({ ok: false, error: msg });
  }
});

module.exports = router;
