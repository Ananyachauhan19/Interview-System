import { Router } from 'express';
import { login, forcePasswordChange, me, changePassword, changeAdminPassword, requestPasswordReset, resetPassword, updateMe, updateMyAvatar } from '../controllers/authController.js';
import { getStudentActivity, getStudentStats, debugStudentActivity } from '../controllers/activityController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter, passwordResetLimiter, uploadLimiter } from '../middleware/rateLimiter.js';
import { validateFileUpload, allowFields } from '../middleware/sanitization.js';
import multer from 'multer';
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB max for avatars
});

// SECURITY: Image file validation middleware
const avatarValidator = validateFileUpload(['jpg', 'jpeg', 'png', 'gif', 'webp'], 2 * 1024 * 1024);

// SECURITY: Mass assignment protection - only allow expected profile fields
const profileUpdateFields = allowFields(['name', 'course', 'branch', 'college']);
const passwordChangeFields = allowFields(['currentPassword', 'newPassword', 'confirmNewPassword']);
const passwordResetFields = allowFields(['email', 'token', 'newPassword', 'confirmPassword']);
const loginFields = allowFields(['email', 'password', 'role']);

const router = Router();

// SECURITY: Rate limit authentication endpoints
router.post('/login', authLimiter, loginFields, login);

// SECURITY: Logout endpoint to clear HttpOnly cookie
router.post('/logout', (req, res) => {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  res.json({ message: 'Logged out successfully' });
});

router.post('/password/change', requireAuth, passwordChangeFields, changePassword);
router.post('/password/admin-change', requireAuth, passwordChangeFields, changeAdminPassword);
router.post('/password/request-reset', passwordResetLimiter, passwordResetFields, requestPasswordReset);
router.post('/password/reset', passwordResetLimiter, passwordResetFields, resetPassword);
router.get('/me', requireAuth, me);
router.put('/me', requireAuth, profileUpdateFields, updateMe);
router.put('/me/avatar', requireAuth, uploadLimiter, upload.single('avatar'), avatarValidator, updateMyAvatar);
router.get('/activity/debug', requireAuth, debugStudentActivity);
router.get('/activity', requireAuth, getStudentStats);
router.get('/stats', requireAuth, getStudentStats);

export default router;
