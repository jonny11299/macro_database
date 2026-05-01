import { Router } from 'express';
import sql from '../db.js';

const router = Router();

// POST /api/sessions
// Body: { user_id: string }
// Creates a new session and returns it.
router.post('/', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ message: 'user_id is required' });

  try {
    const [session] = await sql`
      INSERT INTO sessions (user_id)
      VALUES (${user_id})
      RETURNING *
    `;
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
