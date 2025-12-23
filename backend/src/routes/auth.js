import { Router } from 'express';
import { login, forcePasswordChange, me, changePassword, changeAdminPassword, requestPasswordReset, resetPassword, updateMe, updateMyAvatar } from '../controllers/authController.js';
import { getStudentActivity, getStudentStats, debugStudentActivity } from '../controllers/activityController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter, uploadLimiter } from '../middleware/rateLimiter.js';
import multer from 'multer';
const upload = multer();

const router = Router();

// SECURITY: Rate limit authentication endpoints
router.post('/login', authLimiter, login);
router.post('/password/change', requireAuth, changePassword);
router.post('/password/admin-change', requireAuth, changeAdminPassword);
router.post('/password/request-reset', passwordResetLimiter, requestPasswordReset);
router.post('/password/reset', passwordResetLimiter, resetPassword);
router.get('/me', requireAuth, me);
router.put('/me', requireAuth, updateMe);
router.put('/me/avatar', requireAuth, uploadLimiter, upload.single('avatar'), updateMyAvatar);
router.get('/activity/debug', requireAuth, debugStudentActivity);
router.get('/activity', requireAuth, getStudentActivity);
router.get('/stats', requireAuth, getStudentStats);

export default router;
