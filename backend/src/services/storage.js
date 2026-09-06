/**
 * File storage backed by Vercel Blob.
 *
 * Vercel's filesystem is ephemeral, so uploaded files cannot live on disk.
 * When BLOB_READ_WRITE_TOKEN is not configured (e.g. pure local dev without a
 * blob store) uploads fail with a clear 503 rather than silently losing data.
 */
const { put, del } = require('@vercel/blob');

const isEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

function assertEnabled() {
  if (!isEnabled()) {
    const err = new Error(
      'File storage is not configured. Set BLOB_READ_WRITE_TOKEN (Vercel Blob).'
    );
    err.statusCode = 503;
    throw err;
  }
}

/**
 * @param {Buffer} buffer
 * @param {string} originalName
 * @param {string} contentType
 * @param {string} [folder] optional prefix, e.g. "health-records"
 * @returns {Promise<string>} public URL
 */
async function uploadBuffer(buffer, originalName, contentType, folder = '') {
  assertEnabled();
  const safeName = String(originalName || 'file').replace(/\s+/g, '_');
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const key = `${folder ? folder.replace(/\/$/, '') + '/' : ''}${unique}-${safeName}`;
  const { url } = await put(key, buffer, {
    access: 'public',
    contentType: contentType || 'application/octet-stream',
  });
  return url;
}

/** Best-effort delete. Ignores legacy `/uploads/...` paths. */
async function deleteByUrl(url) {
  if (!url || !isEnabled()) return;
  if (!/\.blob\.vercel-storage\.com/.test(url)) return;
  try {
    await del(url);
  } catch (e) {
    console.error('[storage] delete failed:', e.message);
  }
}

module.exports = { uploadBuffer, deleteByUrl, isEnabled };
