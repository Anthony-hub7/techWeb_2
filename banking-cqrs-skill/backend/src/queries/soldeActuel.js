import { pool } from '../db/readModelDB.js';

export async function soldeActuel(compteId) {
  const { rows } = await pool.query(
    `SELECT compte_id, solde, 'MGA' AS devise, nb_transactions, derniere_op
     FROM read_model_comptes WHERE compte_id = $1`,
    [compteId]
  );
  return rows[0] || null;
}
