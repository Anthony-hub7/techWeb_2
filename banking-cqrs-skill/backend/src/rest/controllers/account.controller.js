import { pool } from '../../db/readModelDB.js';
import { dispatch } from '../../commands/commandBus.js';
import { soldeActuel } from '../../queries/soldeActuel.js';

export async function listAccounts(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM comptes WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAccount(req, res) {
  try {
    const solde = await soldeActuel(req.params.id);
    if (!solde) return res.status(404).json({ error: 'Compte introuvable' });
    res.json(solde);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createAccount(req, res) {
  const client = (await import('../db/eventStoreDB.js')).pool;
  try {
    const { rows } = await client.query(
      `INSERT INTO comptes (user_id) VALUES ($1) RETURNING *`,
      [req.user.id]
    );
    const compte = rows[0];
    await dispatch({
      type: 'CreerCompte',
      payload: { compteId: compte.id, userId: req.user.id, numero: compte.numero },
    });
    res.status(201).json(compte);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
