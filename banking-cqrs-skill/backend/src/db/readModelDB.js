import pg from 'pg';
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/banking_db',
  max: 10,
  idleTimeoutMillis: 30000,
});
pool.on('error', (err) => console.error('Erreur readModelDB:', err));
