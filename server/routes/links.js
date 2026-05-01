import { Router } from 'express';
import sql from '../db.js';

const router = Router();

// GET /api/links
// Optional query param: ?session_id=<uuid>
router.get('/', async (req, res) => {
  try {
    const { session_id } = req.query;

    const links = session_id
      ? await sql`
          SELECT l.*, d.domain_name
          FROM links l
          LEFT JOIN domains d ON l.domain_id = d.domain_id
          WHERE l.session_id = ${session_id}
          ORDER BY l.last_modified DESC
        `
      : await sql`
          SELECT l.*, d.domain_name
          FROM links l
          LEFT JOIN domains d ON l.domain_id = d.domain_id
          ORDER BY l.last_modified DESC
        `;

    res.json(links);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/links/bulk
// Body: {
//   session_id: string,
//   links: [{ file_name, sheet_name, header_name, full_link }]
// }
// Returns: { inserted: Link[], duplicates: string[] }
router.post('/bulk', async (req, res) => {
  const { session_id, links } = req.body;

  if (!session_id) return res.status(400).json({ message: 'session_id is required' });
  if (!Array.isArray(links) || links.length === 0) {
    return res.status(400).json({ message: 'links must be a non-empty array' });
  }

  try {
    // Load domains + macros once for this batch
    const domains = await sql`SELECT * FROM domains`;
    const macros  = await sql`SELECT * FROM macros WHERE macro_pre IS NOT NULL`;

    // Classify each link — match domain and find macro tokens
    const classified = links.map(link => {
      const domain = domains.find(d => link.full_link.includes(d.domain_identifier)) ?? null;
      const matched = macros.filter(m => link.full_link.includes(m.macro_pre));
      return {
        row: {
          session_id,
          file_name:   link.file_name,
          sheet_name:  link.sheet_name,
          header_name: link.header_name ?? null,
          full_link:   link.full_link,
          domain_id:   domain?.domain_id ?? null,
        },
        macros: matched,
      };
    });

    // Bulk insert — UNIQUE constraint on full_link, silently skip conflicts
    const rows     = classified.map(c => c.row);
    const inserted = await sql`
      INSERT INTO links ${sql(rows)}
      ON CONFLICT (full_link) DO NOTHING
      RETURNING *
    `;

    // Any submitted link not in the returned set is a duplicate
    const insertedSet = new Set(inserted.map(r => r.full_link));
    const duplicates  = links
      .filter(l => !insertedSet.has(l.full_link))
      .map(l => l.full_link);

    // Insert link_macros for newly inserted links
    const junctionRows = [];
    for (const insertedLink of inserted) {
      const orig = classified.find(c => c.row.full_link === insertedLink.full_link);
      for (const macro of orig.macros) {
        junctionRows.push({ link_id: insertedLink.link_id, macro_id: macro.macro_id });
      }
    }
    if (junctionRows.length > 0) {
      await sql`
        INSERT INTO link_macros ${sql(junctionRows)}
        ON CONFLICT DO NOTHING
      `;
    }

    res.status(201).json({ inserted, duplicates });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
