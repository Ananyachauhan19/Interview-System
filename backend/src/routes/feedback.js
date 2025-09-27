import { Router } from 'express';
import { submitFeedback, exportEventFeedback, listFeedback, exportFilteredFeedback, listMyFeedback } from '../controllers/feedbackController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/submit', requireAuth, submitFeedback);
router.get('/event/:id.csv', requireAuth, requireAdmin, exportEventFeedback);
router.get('/admin/list', requireAuth, requireAdmin, listFeedback);
router.get('/admin/export.csv', requireAuth, requireAdmin, exportFilteredFeedback);
router.get('/mine', requireAuth, listMyFeedback);

export default router;
