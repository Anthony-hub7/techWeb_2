import { dispatch } from '../../commands/commandBus.js';
import { historiqueTransactions } from '../../queries/historiqueTransactions.js';

export async function crediter(req, res) {
  try {
    const event = await dispatch({
      type: 'CrediterCompte',
      payload: { compteId: req.params.id, montant: req.body.montant, userId: req.user.id },
    });
    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function debiter(req, res) {
  try {
    const event = await dispatch({
      type: 'DebiterCompte',
      payload: { compteId: req.params.id, montant: req.body.montant, userId: req.user.id },
    });
    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function historique(req, res) {
  try {
    const rows = await historiqueTransactions(req.params.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
