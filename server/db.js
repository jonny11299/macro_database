import postgres from 'postgres';

// Local Postgres.app uses your OS username with no password by default.
// When we migrate to Supabase, replace these options with the Supabase connection string.
const sql = postgres(process.env.DATABASE_URL || {
  host:     'localhost',
  port:     5432,
  database: 'macro_database',
});

export default sql;
