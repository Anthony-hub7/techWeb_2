import { dispatch } from '../commands/commandBus.js';
import { pool } from '../db/readModelDB.js';

export const commandResolvers = {
  creerCompte: async (_, __, { user }) => {
    if (!user) throw new Error('Non authentifié');
    const { rows } = await pool.query(
      'INSERT INTO comptes (user_id) VALUES ($1) RETURNING *',
      [user.id]
    );
    const compte = rows[0];
    await dispatch({
      type: 'CreerCompte',
      payload: { compteId: compte.id, userId: user.id, numero: compte.numero },
    });
    return compte;
  },
  crediterCompte: async (_, { compteId, montant }, { user }) => {
    if (!user) throw new Error('Non authentifié');
    return dispatch({
      type: 'CrediterCompte',
      payload: { compteId, montant, userId: user.id },
    });
  },
  debiterCompte: async (_, { compteId, montant }, { user }) => {
    if (!user) throw new Error('Non authentifié');
    return dispatch({
      type: 'DebiterCompte',
      payload: { compteId, montant, userId: user.id },
    });
  },
};
