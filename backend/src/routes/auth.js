import { Router } from 'express';
import { loginAdmin, loginStudent, forcePasswordChange } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/admin/login', loginAdmin);
router.post('/student/login', loginStudent);
router.post('/password/change', requireAuth, forcePasswordChange);

export default router;
