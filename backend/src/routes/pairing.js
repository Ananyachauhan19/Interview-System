import { Router } from 'express';
import { generatePairs, listPairs } from '../controllers/pairingController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/:id/generate', requireAuth, requireAdmin, generatePairs);
router.get('/:id', requireAuth, listPairs);

export default router;
