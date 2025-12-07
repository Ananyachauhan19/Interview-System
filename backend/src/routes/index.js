import { Router } from 'express';
import authRoutes from './auth.js';
import studentRoutes from './students.js';
import eventRoutes from './events.js';
import pairingRoutes from './pairing.js';
import scheduleRoutes from './schedule.js';
import feedbackRoutes from './feedback.js';
import coordinatorRoutes from './coordinators.js';
import subjectRoutes from './subjects.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/events', eventRoutes);
router.use('/pairing', pairingRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/coordinators', coordinatorRoutes);
router.use('/subjects', subjectRoutes);

export default router;
