import { Router } from 'express';
import multer from 'multer';
import { uploadStudentsCsv, createStudent, checkStudentsCsv, listAllStudents } from '../controllers/studentController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/list', requireAuth, requireAdmin, listAllStudents);
router.post('/check', requireAuth, requireAdmin, upload.single('file'), checkStudentsCsv);
router.post('/upload', requireAuth, requireAdmin, upload.single('file'), uploadStudentsCsv);
router.post('/create', requireAuth, requireAdmin, async (req, res) => {
	// delegate to controller helper
	return createStudent(req, res);
});

export default router;
