import { sql } from '@vercel/postgres';

// Simple admin auth check — reads the session token from cookie
function isAdmin(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/ap_session=([^;]+)/);
  if (!match) return false;
  // Token is HMAC-SHA256(secret, 'admin') encoded as hex, set by /api/auth
  // We just verify it matches the env var AP_SESSION_TOKEN set during build/deploy
  return match[1] === process.env.AP_SESSION_TOKEN;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/cars — return all cars ordered by created_at
    if (req.method === 'GET') {
      const { rows } = await sql`SELECT data FROM cars ORDER BY created_at ASC`;
      return res.status(200).json(rows.map(r => r.data));
    }

    // All mutating routes require admin
    if (!isAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // POST /api/cars — create new car
    if (req.method === 'POST') {
      const car = req.body;
      if (!car?.id) return res.status(400).json({ error: 'Missing car id' });
      await sql`
        INSERT INTO cars (id, data)
        VALUES (${car.id}, ${JSON.stringify(car)})
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `;
      return res.status(200).json({ ok: true });
    }

    // PUT /api/cars?id=xxx — update single car
    if (req.method === 'PUT') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const car = req.body;
      await sql`
        UPDATE cars SET data = ${JSON.stringify(car)}, updated_at = NOW()
        WHERE id = ${id}
      `;
      return res.status(200).json({ ok: true });
    }

    // DELETE /api/cars?id=xxx — delete car
    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await sql`DELETE FROM cars WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/cars]', err);
    return res.status(500).json({ error: 'Database error', detail: err.message });
  }
}
