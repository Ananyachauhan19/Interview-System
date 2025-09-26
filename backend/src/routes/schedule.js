import { Router } from 'express';
import { proposeSlots, confirmSlot, rejectSlots } from '../controllers/scheduleController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/:pairId/propose', requireAuth, proposeSlots);
router.post('/:pairId/confirm', requireAuth, confirmSlot);
router.post('/:pairId/reject', requireAuth, rejectSlots);

export default router;
