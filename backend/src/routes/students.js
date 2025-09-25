import { Router } from 'express';
import multer from 'multer';
import { uploadStudentsCsv } from '../controllers/studentController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', requireAuth, requireAdmin, upload.single('file'), uploadStudentsCsv);

export default router;
