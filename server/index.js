import express from 'express';
import sql from './db.js';
import sessionsRouter from './routes/sessions.js';
import linksRouter from './routes/links.js';
import domainsRouter from './routes/domains.js';
import macrosRouter from './routes/macros.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/sessions', sessionsRouter);
app.use('/api/links', linksRouter);
app.use('/api/domains', domainsRouter);
app.use('/api/macros', macrosRouter);

// Health check — also verifies DB connectivity
app.get('/api/health', async (req, res) => {
  try {
    await sql`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
