import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { createCoordinator, listAllCoordinators } from '../controllers/coordinatorController.js';

const router = Router();

router.get('/list', requireAuth, requireAdmin, listAllCoordinators);
router.post('/create', requireAuth, requireAdmin, createCoordinator);

export default router;
