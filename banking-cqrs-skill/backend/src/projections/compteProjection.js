import { pool } from '../db/readModelDB.js';

export const compteProjection = {
  async apply(event) {
    const p = event.payload || {};
    switch (event.type) {
      case 'CompteCreé':
        await pool.query(
          `INSERT INTO read_model_comptes (compte_id, user_id, solde)
           VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`,
          [event.aggregate_id, p.userId]
        );
        break;
      case 'CompteCrédité':
        await pool.query(
          `UPDATE read_model_comptes
           SET solde = solde + $1, nb_transactions = nb_transactions + 1,
               derniere_op = now(), updated_at = now()
           WHERE compte_id = $2`,
          [p.montant, event.aggregate_id]
        );
        break;
      case 'CompteDébité':
        await pool.query(
          `UPDATE read_model_comptes
           SET solde = solde - $1, nb_transactions = nb_transactions + 1,
               derniere_op = now(), updated_at = now()
           WHERE compte_id = $2`,
          [p.montant, event.aggregate_id]
        );
        break;
    }
  },
};
