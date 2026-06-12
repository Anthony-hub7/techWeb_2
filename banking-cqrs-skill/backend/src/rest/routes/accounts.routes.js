import { Router } from 'express';
import { listAccounts, getAccount, createAccount } from '../controllers/account.controller.js';

const router = Router();
router.get('/', listAccounts);
router.post('/', createAccount);
router.get('/:id', getAccount);
export default router;
