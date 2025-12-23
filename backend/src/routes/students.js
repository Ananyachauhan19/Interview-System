import { Router } from 'express';
import multer from 'multer';
import { uploadStudentsCsv, createStudent, checkStudentsCsv, listAllStudents, listAllSpecialStudents, listSpecialStudentsByEvent } from '../controllers/studentController.js';
import { getStudentActivityByAdmin, getStudentStats } from '../controllers/activityController.js';
import { requireAuth, requireAdmin, requireAdminOrCoordinator } from '../middleware/auth.js';
import { bulkOperationLimiter, uploadLimiter } from '../middleware/rateLimiter.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/list', requireAuth, requireAdminOrCoordinator, listAllStudents);
router.get('/special', requireAuth, requireAdmin, listAllSpecialStudents);
router.get('/special/:eventId', requireAuth, requireAdmin, listSpecialStudentsByEvent);
router.get('/:studentId/activity', requireAuth, requireAdminOrCoordinator, getStudentActivityByAdmin);
router.get('/:studentId/stats', requireAuth, requireAdminOrCoordinator, getStudentStats);
// SECURITY: Rate limit bulk operations
router.post('/check', requireAuth, requireAdmin, uploadLimiter, bulkOperationLimiter, upload.single('file'), checkStudentsCsv);
router.post('/upload', requireAuth, requireAdmin, uploadLimiter, bulkOperationLimiter, upload.single('file'), uploadStudentsCsv);
router.post('/create', requireAuth, requireAdmin, async (req, res) => {
	// delegate to controller helper
	return createStudent(req, res);
});

export default router;
