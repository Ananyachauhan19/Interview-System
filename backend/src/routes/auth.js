import { Router } from 'express';
import { login, forcePasswordChange, me, changePassword, requestPasswordReset, resetPassword } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/password/change', requireAuth, changePassword);
router.post('/password/request-reset', requestPasswordReset);
router.post('/password/reset', resetPassword);
router.get('/me', requireAuth, me);

export default router;
