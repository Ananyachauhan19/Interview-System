import express from 'express';
const router = express.Router();
import { requireAuth, requireStudent } from '../middleware/auth.js';
import * as learningController from '../controllers/learningController.js';

// Middleware to allow both students and admins
const requireStudentOrAdmin = (req, res, next) => {
  if (!req.user || (req.user.role !== 'student' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Student or Admin access only' });
  }
  next();
};

// Get all semesters with subjects grouped by semester and subject name
router.get('/semesters', requireAuth, requireStudentOrAdmin, learningController.getAllSemestersForStudent);

// Get all subjects by a specific coordinator
router.get('/coordinator/:coordinatorId/subjects', requireAuth, requireStudentOrAdmin, learningController.getCoordinatorSubjects);

// Get specific subject details with chapters and topics
router.get('/semester/:semesterId/subject/:subjectId', requireAuth, requireStudentOrAdmin, learningController.getSubjectDetails);

// Update topic progress (video watched time) - students only
router.post('/semester/:semesterId/subject/:subjectId/chapter/:chapterId/topic/:topicId/progress', 
  requireAuth,
  requireStudent, 
  learningController.updateTopicProgress
);

// Get progress for a specific topic - students only
router.get('/topic/:topicId/progress', requireAuth, requireStudent, learningController.getTopicProgress);

// Start video tracking (3-minute backend timer) - students only
router.post('/topic/:topicId/start', requireAuth, requireStudent, learningController.startVideoTracking);

// Manual topic completion - students only
router.post('/topic/:topicId/complete', requireAuth, requireStudent, learningController.markTopicComplete);
router.post('/topic/:topicId/incomplete', requireAuth, requireStudent, learningController.markTopicIncomplete);

// Get progress for a specific subject - students only
router.get('/subject/:subjectId/progress', requireAuth, requireStudent, learningController.getSubjectProgress);

// Get all progress for the student (analytics) - students only
router.get('/progress', requireAuth, requireStudent, learningController.getStudentProgress);

export default router;
