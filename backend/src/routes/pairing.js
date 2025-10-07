import { Router } from 'express';
import { listPairs, setMeetingLink } from '../controllers/pairingController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/:id', requireAuth, listPairs);
router.post('/pair/:pairId/link', requireAuth, requireAdmin, setMeetingLink);

export default router;
