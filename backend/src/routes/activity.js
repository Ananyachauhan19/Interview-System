import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getActivities,
  getActivityStats,
  exportActivitiesCSV
} from '../controllers/adminActivityController.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Get activities (admin sees all, coordinator sees only their own)
router.get('/', getActivities);

// Get activity statistics
router.get('/stats', getActivityStats);

// Export activities as CSV
router.get('/export', exportActivitiesCSV);

export default router;
