import { Router } from 'express';
import sql from '../db.js';

const router = Router();

// GET /api/domains
router.get('/', async (req, res) => {
  try {
    const domains = await sql`SELECT * FROM domains ORDER BY domain_name ASC`;
    res.json(domains);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/domains
// Body: { domain_name, domain_identifier }
router.post('/', async (req, res) => {
  const { domain_name, domain_identifier } = req.body;
  if (!domain_name || !domain_identifier) {
    return res.status(400).json({ message: 'domain_name and domain_identifier are required' });
  }
  try {
    const [domain] = await sql`
      INSERT INTO domains (domain_name, domain_identifier)
      VALUES (${domain_name}, ${domain_identifier})
      RETURNING *
    `;
    res.status(201).json(domain);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/domains/:id
// Body: { domain_name?, domain_identifier? }
router.put('/:id', async (req, res) => {
  const { domain_name, domain_identifier } = req.body;
  try {
    const [domain] = await sql`
      UPDATE domains
      SET
        domain_name       = COALESCE(${domain_name       ?? null}, domain_name),
        domain_identifier = COALESCE(${domain_identifier ?? null}, domain_identifier),
        last_modified     = now()
      WHERE domain_id = ${req.params.id}
      RETURNING *
    `;
    if (!domain) return res.status(404).json({ message: 'Domain not found' });
    res.json(domain);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/domains/:id
router.delete('/:id', async (req, res) => {
  try {
    const [domain] = await sql`
      DELETE FROM domains WHERE domain_id = ${req.params.id} RETURNING *
    `;
    if (!domain) return res.status(404).json({ message: 'Domain not found' });
    res.json({ deleted: domain });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
