import { Router } from 'express';
import { listPairs, setMeetingLink, getPairDetails } from '../controllers/pairingController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// More specific routes first to avoid conflicts
router.get('/pair/:pairId', requireAuth, getPairDetails);
router.post('/pair/:pairId/link', requireAuth, requireAdmin, setMeetingLink);
router.get('/:id', requireAuth, listPairs);

export default router;
