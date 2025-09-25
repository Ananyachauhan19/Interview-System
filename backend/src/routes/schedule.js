import { Router } from 'express';
import { proposeSlots, confirmSlot } from '../controllers/scheduleController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/:pairId/propose', requireAuth, proposeSlots);
router.post('/:pairId/confirm', requireAuth, confirmSlot);

export default router;
