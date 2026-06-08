import { sql } from '@vercel/postgres';

function isAdmin(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/ap_session=([^;]+)/);
  if (!match) return false;
  return match[1] === process.env.AP_SESSION_TOKEN;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/reviews — public gets approved only; admin gets all
    if (req.method === 'GET') {
      const admin = isAdmin(req);
      const { rows } = admin
        ? await sql`SELECT id, data, approved FROM reviews ORDER BY created_at ASC`
        : await sql`SELECT id, data, approved FROM reviews WHERE approved = true ORDER BY created_at ASC`;
      return res.status(200).json(
        rows.map(r => ({ ...r.data, id: r.id, approved: r.approved }))
      );
    }

    // POST /api/reviews — public can submit a review (goes in as unapproved)
    if (req.method === 'POST') {
      const rv = req.body;
      if (!rv?.id || !rv?.nume || !rv?.text) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      // Strip approved field from public submissions
      const { approved: _ignored, ...safeRv } = rv;
      await sql`
        INSERT INTO reviews (id, data, approved)
        VALUES (${safeRv.id}, ${JSON.stringify(safeRv)}, false)
        ON CONFLICT (id) DO NOTHING
      `;
      return res.status(200).json({ ok: true });
    }

    // All routes below require admin
    if (!isAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // PUT /api/reviews?id=xxx&action=approve|update — approve or update review
    if (req.method === 'PUT') {
      const { id, action } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing id' });

      if (action === 'approve') {
        await sql`UPDATE reviews SET approved = true WHERE id = ${id}`;
        return res.status(200).json({ ok: true });
      }

      // Full update
      const rv = req.body;
      await sql`
        UPDATE reviews
        SET data = ${JSON.stringify(rv)}, approved = ${rv.approved ?? false}
        WHERE id = ${id}
      `;
      return res.status(200).json({ ok: true });
    }

    // DELETE /api/reviews?id=xxx
    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await sql`DELETE FROM reviews WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/reviews]', err);
    return res.status(500).json({ error: 'Database error', detail: err.message });
  }
}
