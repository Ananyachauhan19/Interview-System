import { Router } from 'express';
import multer from 'multer';
import { uploadStudentsCsv, createStudent, checkStudentsCsv, listAllStudents, listAllSpecialStudents, listSpecialStudentsByEvent, deleteStudent, updateStudent } from '../controllers/studentController.js';
import { getStudentActivityByAdmin, getStudentStats } from '../controllers/activityController.js';
import { requireAuth, requireAdmin, requireAdminOrCoordinator } from '../middleware/auth.js';
import { authorizeStudent } from '../middleware/authorization.js';
import { uploadLimiter, bulkOperationLimiter } from '../middleware/rateLimiter.js';
import { validateFileUpload, allowFields } from '../middleware/sanitization.js';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// SECURITY: CSV file validation middleware
const csvFileValidator = validateFileUpload(['csv'], 5 * 1024 * 1024);

// SECURITY: Mass assignment protection - only allow expected fields for student operations
const studentCreateFields = allowFields(['name', 'email', 'studentid', 'branch', 'course', 'college', 'teacherid', 'semester', 'group']);
const studentUpdateFields = allowFields(['name', 'email', 'studentId', 'course', 'branch', 'college', 'semester', 'group', 'teacherId']);

router.get('/list', requireAuth, requireAdminOrCoordinator, listAllStudents);
router.get('/special', requireAuth, requireAdmin, listAllSpecialStudents);
router.get('/special/:eventId', requireAuth, requireAdmin, listSpecialStudentsByEvent);
// SECURITY: Add authorization check for student-specific data
router.get('/:studentId/activity', requireAuth, authorizeStudent('studentId'), getStudentActivityByAdmin);
router.get('/:studentId/stats', requireAuth, authorizeStudent('studentId'), getStudentStats);
// SECURITY: Rate limit bulk operations + file validation
router.post('/check', requireAuth, requireAdmin, uploadLimiter, bulkOperationLimiter, upload.single('file'), csvFileValidator, checkStudentsCsv);
router.post('/upload', requireAuth, requireAdmin, uploadLimiter, bulkOperationLimiter, upload.single('file'), csvFileValidator, uploadStudentsCsv);
router.post('/create', requireAuth, requireAdmin, studentCreateFields, async (req, res) => {
	return createStudent(req, res);
});
router.put('/:studentId', requireAuth, requireAdmin, studentUpdateFields, updateStudent);
router.delete('/:studentId', requireAuth, requireAdmin, deleteStudent);

export default router;