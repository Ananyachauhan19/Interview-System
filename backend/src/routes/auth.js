import { Router } from 'express';
import { login, forcePasswordChange, me, changePassword, changeAdminPassword, requestPasswordReset, resetPassword, updateMe, updateMyAvatar } from '../controllers/authController.js';
import { getStudentActivity, getStudentStats, debugStudentActivity } from '../controllers/activityController.js';
import { requireAuth } from '../middleware/auth.js';
import multer from 'multer';
const upload = multer();

const router = Router();

router.post('/login', login);
router.post('/password/change', requireAuth, changePassword);
router.post('/password/admin-change', requireAuth, changeAdminPassword);
router.post('/password/request-reset', requestPasswordReset);
router.post('/password/reset', resetPassword);
router.get('/me', requireAuth, me);
router.put('/me', requireAuth, updateMe);
router.put('/me/avatar', requireAuth, upload.single('avatar'), updateMyAvatar);
router.get('/activity/debug', requireAuth, debugStudentActivity);
router.get('/activity', requireAuth, getStudentActivity);
router.get('/stats', requireAuth, getStudentStats);

export default router;
