import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { createCoordinator, listAllCoordinators } from '../controllers/coordinatorController.js';
import { allowFields } from '../middleware/sanitization.js';

const router = Router();

// SECURITY: Mass assignment protection - only allow expected fields
const coordinatorCreateFields = allowFields(['coordinatorName', 'coordinatorEmail', 'coordinatorPassword', 'coordinatorID']);

router.get('/list', requireAuth, requireAdmin, listAllCoordinators);
router.post('/create', requireAuth, requireAdmin, coordinatorCreateFields, createCoordinator);

export default router;
