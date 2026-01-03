import { Router } from 'express';
import multer from 'multer';
import { uploadStudentsCsv, createStudent, checkStudentsCsv, listAllStudents, listAllSpecialStudents, listSpecialStudentsByEvent } from '../controllers/studentController.js';
import { getStudentActivityByAdmin, getStudentStats } from '../controllers/activityController.js';
import { requireAuth, requireAdmin, requireAdminOrCoordinator } from '../middleware/auth.js';
import { authorizeStudent } from '../middleware/authorization.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/list', requireAuth, requireAdminOrCoordinator, listAllStudents);
router.get('/special', requireAuth, requireAdmin, listAllSpecialStudents);
router.get('/special/:eventId', requireAuth, requireAdmin, listSpecialStudentsByEvent);
// SECURITY: Add authorization check for student-specific data
router.get('/:studentId/activity', requireAuth, authorizeStudent('studentId'), getStudentActivityByAdmin);
router.get('/:studentId/stats', requireAuth, authorizeStudent('studentId'), getStudentStats);
// Admin-only bulk operations (no rate limit - admin is trusted)
router.post('/check', requireAuth, requireAdmin, upload.single('file'), checkStudentsCsv);
router.post('/upload', requireAuth, requireAdmin, upload.single('file'), uploadStudentsCsv);
router.post('/create', requireAuth, requireAdmin, async (req, res) => {
	// delegate to controller helper
	return createStudent(req, res);
});

export default router;
