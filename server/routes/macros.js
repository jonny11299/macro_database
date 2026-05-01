import { Router } from 'express';
import sql from '../db.js';

const router = Router();

// GET /api/macros
router.get('/', async (req, res) => {
  try {
    const macros = await sql`SELECT * FROM macros ORDER BY macro_title ASC`;
    res.json(macros);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/macros
// Body: { macro_title, macro_pre?, macro_post? }
router.post('/', async (req, res) => {
  const { macro_title, macro_pre, macro_post } = req.body;
  if (!macro_title) return res.status(400).json({ message: 'macro_title is required' });
  try {
    const [macro] = await sql`
      INSERT INTO macros (macro_title, macro_pre, macro_post)
      VALUES (${macro_title}, ${macro_pre ?? null}, ${macro_post ?? null})
      RETURNING *
    `;
    res.status(201).json(macro);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/macros/:id
// Body: { macro_title?, macro_pre?, macro_post? }
router.put('/:id', async (req, res) => {
  const { macro_title, macro_pre, macro_post } = req.body;
  try {
    const [macro] = await sql`
      UPDATE macros
      SET
        macro_title   = COALESCE(${macro_title ?? null}, macro_title),
        macro_pre     = COALESCE(${macro_pre   ?? null}, macro_pre),
        macro_post    = COALESCE(${macro_post  ?? null}, macro_post),
        last_modified = now()
      WHERE macro_id = ${req.params.id}
      RETURNING *
    `;
    if (!macro) return res.status(404).json({ message: 'Macro not found' });
    res.json(macro);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/macros/:id
router.delete('/:id', async (req, res) => {
  try {
    const [macro] = await sql`
      DELETE FROM macros WHERE macro_id = ${req.params.id} RETURNING *
    `;
    if (!macro) return res.status(404).json({ message: 'Macro not found' });
    res.json({ deleted: macro });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
