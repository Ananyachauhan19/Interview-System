import { Router } from 'express';
import { login, forcePasswordChange, me } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/password/change', requireAuth, forcePasswordChange);
router.get('/me', requireAuth, me);

export default router;
