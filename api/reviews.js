import { getDb } from './_db.js';

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

  const db = getDb();

  try {
    if (req.method === 'GET') {
      const admin = isAdmin(req);
      const { rows } = await db.execute(
        admin
          ? 'SELECT id, data, approved FROM reviews ORDER BY created_at ASC'
          : 'SELECT id, data, approved FROM reviews WHERE approved = 1 ORDER BY created_at ASC'
      );
      return res.status(200).json(
        rows.map(r => ({ ...JSON.parse(r.data), id: r.id, approved: !!r.approved }))
      );
    }

    if (req.method === 'POST') {
      const rv = req.body;
      if (!rv?.id || !rv?.nume || !rv?.text) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const { approved: _ignored, ...safeRv } = rv;
      await db.execute({
        sql: 'INSERT INTO reviews (id, data, approved) VALUES (?, ?, 0) ON CONFLICT (id) DO NOTHING',
        args: [safeRv.id, JSON.stringify(safeRv)],
      });
      return res.status(200).json({ ok: true });
    }

    if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'PUT') {
      const { id, action } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      if (action === 'approve') {
        await db.execute({ sql: 'UPDATE reviews SET approved = 1 WHERE id = ?', args: [id] });
        return res.status(200).json({ ok: true });
      }
      const rv = req.body;
      await db.execute({
        sql: 'UPDATE reviews SET data = ?, approved = ? WHERE id = ?',
        args: [JSON.stringify(rv), rv.approved ? 1 : 0, id],
      });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await db.execute({ sql: 'DELETE FROM reviews WHERE id = ?', args: [id] });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/reviews]', err);
    return res.status(500).json({ error: 'Database error', detail: err.message });
  }
}
