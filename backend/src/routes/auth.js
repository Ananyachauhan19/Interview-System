import { Router } from 'express';
import { login, forcePasswordChange, me, changePassword, changeAdminPassword, requestPasswordReset, resetPassword } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/password/change', requireAuth, changePassword);
router.post('/password/admin-change', requireAuth, changeAdminPassword);
router.post('/password/request-reset', requestPasswordReset);
router.post('/password/reset', resetPassword);
router.get('/me', requireAuth, me);

export default router;
