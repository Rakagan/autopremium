import { getDb } from './_db.js';

function isAdmin(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/ap_session=([^;]+)/);
  if (!match) return false;
  return match[1] === process.env.AP_SESSION_TOKEN;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const db = getDb();

  try {
    if (req.method === 'GET') {
      const { rows } = await db.execute('SELECT key, data FROM page_content');
      if (!rows.length) return res.status(200).json(null);
      const merged = {};
      rows.forEach(r => { merged[r.key] = JSON.parse(r.data); });
      return res.status(200).json(merged);
    }

    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'PUT') {
      const content = req.body;
      if (!content || typeof content !== 'object') {
        return res.status(400).json({ error: 'Invalid body' });
      }
      for (const [key, value] of Object.entries(content)) {
        await db.execute({
          sql: 'INSERT INTO page_content (key, data) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP',
          args: [key, JSON.stringify(value)],
        });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/content]', err);
    return res.status(500).json({ error: 'Database error', detail: err.message });
  }
}
