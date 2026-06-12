import { pool } from '../db/readModelDB.js';

export async function historiqueTransactions(compteId) {
  const { rows } = await pool.query(
    `SELECT id, type, payload, version, created_at
     FROM events WHERE aggregate_id = $1 ORDER BY version ASC`,
    [compteId]
  );
  return rows.map(r => ({
    id: r.id,
    type: r.type,
    montant: r.payload?.montant || 0,
    devise: r.payload?.devise || 'MGA',
    version: r.version,
    created_at: r.created_at,
  }));
}
