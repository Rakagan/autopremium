import { sql } from '@vercel/postgres';

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

  try {
    // GET /api/content — returns all content rows merged into a single object
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT key, data FROM page_content`;
      // If no rows yet, return null so the frontend uses its defaults
      if (!rows.length) return res.status(200).json(null);
      const merged = {};
      rows.forEach(r => { merged[r.key] = r.data; });
      return res.status(200).json(merged);
    }

    if (!isAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // PUT /api/content — body is the full pageContent object; upsert each key
    if (req.method === 'PUT') {
      const content = req.body;
      if (!content || typeof content !== 'object') {
        return res.status(400).json({ error: 'Invalid body' });
      }
      for (const [key, value] of Object.entries(content)) {
        await sql`
          INSERT INTO page_content (key, data)
          VALUES (${key}, ${JSON.stringify(value)})
          ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
        `;
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/content]', err);
    return res.status(500).json({ error: 'Database error', detail: err.message });
  }
}
