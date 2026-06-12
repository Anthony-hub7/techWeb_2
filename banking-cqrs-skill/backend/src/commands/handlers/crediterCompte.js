import { eventStore } from '../../events/eventStore.js';
import { eventBus } from '../../events/eventBus.js';

export async function crediterCompteHandler({ compteId, montant, userId, ref }) {
  const version = await eventStore.nextVersion(compteId);
  const event = {
    aggregate_id: compteId,
    version,
    type: 'CompteCrédité',
    payload: { montant, devise: 'MGA', ref },
    created_by: userId,
  };
  await eventStore.append(event);
  eventBus.emit('compte.events', event);
  return event;
}
