// Admin authentication
// On login: verifies SHA-256 hash of password against AP_PASSWORD_HASH env var,
// then sets an httpOnly cookie with AP_SESSION_TOKEN.
//
// Required environment variables in Vercel:
//   AP_PASSWORD_HASH  — SHA-256 hex of your admin password
//   AP_SESSION_TOKEN  — a long random secret string (e.g. openssl rand -hex 32)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, hash } = req.body || {};

  // POST { action: 'check' } — returns 200 if session cookie is valid, 401 otherwise
  if (action === 'check') {
    const cookie = req.headers.cookie || '';
    const match = cookie.match(/ap_session=([^;]+)/);
    const sessionToken = process.env.AP_SESSION_TOKEN;
    if (match && sessionToken && match[1] === sessionToken) {
      return res.status(200).json({ ok: true, admin: true });
    }
    return res.status(401).json({ ok: false, admin: false });
  }

  // POST { action: 'login', hash: '<sha256-of-password>' }
  if (action === 'login') {
    if (!hash) return res.status(400).json({ error: 'Missing hash' });

    const expectedHash = process.env.AP_PASSWORD_HASH;
    if (!expectedHash) {
      return res.status(500).json({ error: 'AP_PASSWORD_HASH not configured' });
    }

    if (hash !== expectedHash) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const sessionToken = process.env.AP_SESSION_TOKEN;
    if (!sessionToken) {
      return res.status(500).json({ error: 'AP_SESSION_TOKEN not configured' });
    }

    // Set secure httpOnly cookie valid for 8 hours
    res.setHeader(
      'Set-Cookie',
      `ap_session=${sessionToken}; HttpOnly; Path=/; SameSite=Strict; Max-Age=28800${
        process.env.NODE_ENV === 'production' ? '; Secure' : ''
      }`
    );
    return res.status(200).json({ ok: true });
  }

  // POST { action: 'logout' }
  if (action === 'logout') {
    res.setHeader(
      'Set-Cookie',
      'ap_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0'
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
