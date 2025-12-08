import Pair from '../models/Pair.js';
import Progress from '../models/Progress.js';
import User from '../models/User.js';
import SpecialStudent from '../models/SpecialStudent.js';
import { HttpError } from '../utils/errors.js';

/**
 * Get student activity data for contribution calendar
 * Aggregates:
 * - Sessions scheduled (finalConfirmedTime set)
 * - Course completions (completed topics)
 * Returns counts grouped by date
 */
export async function getStudentActivity(req, res) {
  const user = req.user;
  if (!user) throw new HttpError(401, 'Unauthorized');
  if (user.role !== 'student') throw new HttpError(403, 'Only students can access activity data');

  const { year } = req.query;
  const targetYear = year ? parseInt(year) : new Date().getFullYear();
  
  // Date range for the specified year
  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

  try {
    // 1. Get scheduled sessions (pairs with finalConfirmedTime)
    const scheduledSessions = await Pair.aggregate([
      {
        $match: {
          $or: [
            { interviewer: user._id, interviewerModel: user.isSpecialStudent ? 'SpecialStudent' : 'User' },
            { interviewee: user._id, intervieweeModel: user.isSpecialStudent ? 'SpecialStudent' : 'User' }
          ],
          finalConfirmedTime: { 
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$finalConfirmedTime' }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // 2. Get completed topics (learning progress)
    const completedTopics = await Progress.aggregate([
      {
        $match: {
          studentId: user._id,
          completed: true,
          completedAt: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // 3. Merge activity data
    const activityMap = {};
    
    scheduledSessions.forEach(item => {
      const date = item._id;
      if (!activityMap[date]) activityMap[date] = 0;
      activityMap[date] += item.count;
    });

    completedTopics.forEach(item => {
      const date = item._id;
      if (!activityMap[date]) activityMap[date] = 0;
      activityMap[date] += item.count;
    });

    // 4. Get available years (years when user was active)
    const userCreatedYear = user.createdAt ? new Date(user.createdAt).getFullYear() : targetYear;
    const currentYear = new Date().getFullYear();
    const availableYears = [];
    for (let y = userCreatedYear; y <= currentYear; y++) {
      availableYears.push(y);
    }

    res.json({
      activityByDate: activityMap,
      year: targetYear,
      availableYears,
      stats: {
        totalSessions: scheduledSessions.reduce((sum, item) => sum + item.count, 0),
        totalCompletions: completedTopics.reduce((sum, item) => sum + item.count, 0),
        totalActivities: Object.values(activityMap).reduce((sum, val) => sum + val, 0)
      }
    });
  } catch (error) {
    console.error('[Get Student Activity Error]', error);
    throw new HttpError(500, 'Failed to fetch activity data');
  }
}

/**
 * Get any student's activity data (admin only)
 * Same as getStudentActivity but allows admin to view any student's data
 */
export async function getStudentActivityByAdmin(req, res) {
  const user = req.user;
  if (!user) throw new HttpError(401, 'Unauthorized');
  if (user.role !== 'admin' && user.role !== 'coordinator') {
    throw new HttpError(403, 'Only admins and coordinators can access this data');
  }

  const { studentId } = req.params;
  const { year } = req.query;
  
  if (!studentId) throw new HttpError(400, 'Student ID is required');

  // Find the student
  let student = await User.findById(studentId);
  if (!student) {
    student = await SpecialStudent.findById(studentId);
  }
  if (!student) throw new HttpError(404, 'Student not found');
  if (student.role !== 'student' && !student.isSpecialStudent) {
    throw new HttpError(400, 'Invalid student ID');
  }

  const targetYear = year ? parseInt(year) : new Date().getFullYear();
  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

  try {
    // Get scheduled sessions
    const scheduledSessions = await Pair.aggregate([
      {
        $match: {
          $or: [
            { interviewer: student._id, interviewerModel: student.isSpecialStudent ? 'SpecialStudent' : 'User' },
            { interviewee: student._id, intervieweeModel: student.isSpecialStudent ? 'SpecialStudent' : 'User' }
          ],
          finalConfirmedTime: { 
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$finalConfirmedTime' }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get completed topics
    const completedTopics = await Progress.aggregate([
      {
        $match: {
          studentId: student._id,
          completed: true,
          completedAt: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Merge activity data
    const activityMap = {};
    
    scheduledSessions.forEach(item => {
      const date = item._id;
      if (!activityMap[date]) activityMap[date] = 0;
      activityMap[date] += item.count;
    });

    completedTopics.forEach(item => {
      const date = item._id;
      if (!activityMap[date]) activityMap[date] = 0;
      activityMap[date] += item.count;
    });

    // Get available years
    const userCreatedYear = student.createdAt ? new Date(student.createdAt).getFullYear() : targetYear;
    const currentYear = new Date().getFullYear();
    const availableYears = [];
    for (let y = userCreatedYear; y <= currentYear; y++) {
      availableYears.push(y);
    }

    res.json({
      activityByDate: activityMap,
      year: targetYear,
      availableYears,
      stats: {
        totalSessions: scheduledSessions.reduce((sum, item) => sum + item.count, 0),
        totalCompletions: completedTopics.reduce((sum, item) => sum + item.count, 0),
        totalActivities: Object.values(activityMap).reduce((sum, val) => sum + val, 0)
      }
    });
  } catch (error) {
    console.error('[Get Student Activity By Admin Error]', error);
    throw new HttpError(500, 'Failed to fetch activity data');
  }
}
