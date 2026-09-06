const axios = require('axios');

/**
 * Verify a Cloudflare Turnstile token.
 *
 * If TURNSTILE_SECRET_KEY is not configured (local dev), verification is
 * skipped so the flow still works — set the key in production to enforce it.
 *
 * @param {string} token  the `cf-turnstile-response` token from the browser
 * @param {string} [ip]   the client IP (optional, improves scoring)
 * @returns {Promise<{ok: boolean, skipped?: boolean, error?: string, data?: object}>}
 */
async function verifyCaptcha(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn('[captcha] TURNSTILE_SECRET_KEY not set — skipping verification');
    return { ok: true, skipped: true };
  }
  if (!token) return { ok: false, error: 'missing-token' };

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.append('remoteip', ip);

    const { data } = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 }
    );
    return { ok: !!data.success, data, error: data.success ? undefined : (data['error-codes'] || []).join(',') };
  } catch (e) {
    console.error('[captcha] siteverify request failed:', e.message);
    return { ok: false, error: 'verify-request-failed' };
  }
}

module.exports = { verifyCaptcha };
