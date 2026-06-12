import { eventBus } from '../events/eventBus.js';
import { compteProjection } from './compteProjection.js';

export function startProjectionRunner() {
  eventBus.on('compte.events', async (event) => {
    try {
      await compteProjection.apply(event);
      console.log(`Projection appliquée: ${event.type} (${event.aggregate_id})`);
    } catch (err) {
      console.error('Erreur de projection:', err.message);
    }
  });
  console.log('Projection runner démarré (in-process)');
}
