import { Router } from 'express';
import { crediter, debiter, historique } from '../controllers/transaction.controller.js';

const router = Router();
router.post('/:id/credit', crediter);
router.post('/:id/debit', debiter);
router.get('/:id/history', historique);
export default router;
