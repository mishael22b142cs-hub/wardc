// Shared wrapper for Vercel Cron endpoints (backend/api/cron/*).
// Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` when a cron
// fires (when CRON_SECRET is configured). We reject anything else so the
// endpoints cannot be triggered by the public.
require('dotenv').config();

module.exports = function runCron(name, task) {
  return async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers['authorization'] || '';
      if (auth !== `Bearer ${secret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
    try {
      const result = await task();
      console.log(`[cron:${name}]`, JSON.stringify(result));
      return res.status(200).json({ ok: true, job: name, result });
    } catch (err) {
      console.error(`[cron:${name}] failed:`, err);
      return res.status(500).json({ ok: false, job: name, error: err.message });
    }
  };
};
