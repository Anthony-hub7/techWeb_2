export function createCompteCreéEvent({ aggregate_id, userId, numero }, created_by) {
  return {
    aggregate_id,
    version: 0,
    type: 'CompteCreé',
    payload: { userId, numero },
    created_by,
  };
}
