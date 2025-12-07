import express from 'express';
const router = express.Router();
import { requireAuth, requireStudent } from '../middleware/auth.js';
import * as learningController from '../controllers/learningController.js';

// Get all semesters with subjects grouped by semester and subject name
router.get('/semesters', requireAuth, requireStudent, learningController.getAllSemestersForStudent);

// Get all subjects by a specific coordinator
router.get('/coordinator/:coordinatorId/subjects', requireAuth, requireStudent, learningController.getCoordinatorSubjects);

// Get specific subject details with chapters and topics
router.get('/semester/:semesterId/subject/:subjectId', requireAuth, requireStudent, learningController.getSubjectDetails);

// Update topic progress (video watched time)
router.post('/semester/:semesterId/subject/:subjectId/chapter/:chapterId/topic/:topicId/progress', 
  requireAuth,
  requireStudent, 
  learningController.updateTopicProgress
);

// Get progress for a specific topic
router.get('/topic/:topicId/progress', requireAuth, requireStudent, learningController.getTopicProgress);

// Start video tracking (3-minute backend timer)
router.post('/topic/:topicId/start', requireAuth, requireStudent, learningController.startVideoTracking);

// Get progress for a specific subject
router.get('/subject/:subjectId/progress', requireAuth, requireStudent, learningController.getSubjectProgress);

// Get all progress for the student (analytics)
router.get('/progress', requireAuth, requireStudent, learningController.getStudentProgress);

export default router;
