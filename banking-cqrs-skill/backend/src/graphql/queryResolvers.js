import { pool } from '../db/readModelDB.js';
import { soldeActuel } from '../queries/soldeActuel.js';
import { historiqueTransactions } from '../queries/historiqueTransactions.js';

export const queryResolvers = {
  soldeActuel: async (_, { compteId }) => soldeActuel(compteId),
  historiqueTransactions: async (_, { compteId }) => historiqueTransactions(compteId),
  mesComptes: async (_, __, { user }) => {
    if (!user) throw new Error('Non authentifié');
    const { rows } = await pool.query(
      'SELECT * FROM comptes WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );
    return rows;
  },
};
