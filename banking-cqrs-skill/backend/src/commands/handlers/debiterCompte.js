import { eventStore } from '../../events/eventStore.js';
import { eventBus } from '../../events/eventBus.js';
import { pool } from '../../db/readModelDB.js';

export async function debiterCompteHandler({ compteId, montant, userId, ref }) {
  const { rows } = await pool.query(
    'SELECT solde FROM read_model_comptes WHERE compte_id = $1',
    [compteId]
  );
  if (rows.length === 0) throw new Error('Compte introuvable');
  if (parseFloat(rows[0].solde) < montant) throw new Error('Solde insuffisant');

  const version = await eventStore.nextVersion(compteId);
  const event = {
    aggregate_id: compteId,
    version,
    type: 'CompteDébité',
    payload: { montant, devise: 'MGA', ref },
    created_by: userId,
  };
  await eventStore.append(event);
  eventBus.emit('compte.events', event);
  return event;
}
