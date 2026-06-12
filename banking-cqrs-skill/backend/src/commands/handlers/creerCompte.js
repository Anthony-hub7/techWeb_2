import { eventStore } from '../../events/eventStore.js';
import { eventBus } from '../../events/eventBus.js';

export async function creerCompteHandler({ compteId, userId, numero }) {
  const event = {
    aggregate_id: compteId,
    version: 1,
    type: 'CompteCreé',
    payload: { userId, numero },
    created_by: userId,
  };
  await eventStore.append(event);
  eventBus.emit('compte.events', event);
  return event;
}
