export function createCompteCréditéEvent({ aggregate_id, montant, devise, ref }, created_by) {
  return {
    aggregate_id,
    version: 0,
    type: 'CompteCrédité',
    payload: { montant, devise: devise || 'MGA', ref },
    created_by,
  };
}
