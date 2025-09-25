import { Router } from 'express';
import { submitFeedback, exportEventFeedback } from '../controllers/feedbackController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/submit', requireAuth, submitFeedback);
router.get('/event/:id.csv', requireAuth, requireAdmin, exportEventFeedback);

export default router;
