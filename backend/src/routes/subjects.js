import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireCoordinator } from '../middleware/auth.js';
import {
  listSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
  reorderSemesters,
  addSubject,
  updateSubject,
  deleteSubject,
  reorderSubjects,
  addChapter,
  updateChapter,
  deleteChapter,
  reorderChapters,
  addTopic,
  updateTopic,
  deleteTopic,
  reorderTopics
} from '../controllers/subjectController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Semester routes
router.get('/', requireAuth, requireCoordinator, listSemesters);
router.post('/', requireAuth, requireCoordinator, createSemester);
router.put('/:id', requireAuth, requireCoordinator, updateSemester);
router.delete('/:id', requireAuth, requireCoordinator, deleteSemester);
router.post('/reorder', requireAuth, requireCoordinator, reorderSemesters);

// Subject routes (nested under semester)
router.post('/:semesterId/subjects', requireAuth, requireCoordinator, addSubject);
router.put('/:semesterId/subjects/:subjectId', requireAuth, requireCoordinator, updateSubject);
router.delete('/:semesterId/subjects/:subjectId', requireAuth, requireCoordinator, deleteSubject);
router.post('/:semesterId/subjects/reorder', requireAuth, requireCoordinator, reorderSubjects);

// Chapter routes (nested under subject)
router.post('/:semesterId/subjects/:subjectId/chapters', requireAuth, requireCoordinator, addChapter);
router.put('/:semesterId/subjects/:subjectId/chapters/:chapterId', requireAuth, requireCoordinator, updateChapter);
router.delete('/:semesterId/subjects/:subjectId/chapters/:chapterId', requireAuth, requireCoordinator, deleteChapter);
router.post('/:semesterId/subjects/:subjectId/chapters/reorder', requireAuth, requireCoordinator, reorderChapters);

// Topic routes (nested under chapter) - with file upload support
router.post('/:semesterId/subjects/:subjectId/chapters/:chapterId/topics', requireAuth, requireCoordinator, upload.single('questionPDF'), addTopic);
router.put('/:semesterId/subjects/:subjectId/chapters/:chapterId/topics/:topicId', requireAuth, requireCoordinator, upload.single('questionPDF'), updateTopic);
router.delete('/:semesterId/subjects/:subjectId/chapters/:chapterId/topics/:topicId', requireAuth, requireCoordinator, deleteTopic);
router.post('/:semesterId/subjects/:subjectId/chapters/:chapterId/topics/reorder', requireAuth, requireCoordinator, reorderTopics);

export default router;
