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

  // Always use rolling 365-day window ending today
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 364); // 365 days including today
  startDate.setHours(0, 0, 0, 0);

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

    // Calculate streaks
    const calculateStreaks = () => {
      const sortedDates = Object.keys(activityMap).sort();
      if (sortedDates.length === 0) return { currentStreak: 0, bestStreak: 0 };

      let currentStreak = 0;
      let bestStreak = 0;
      let tempStreak = 0;
      
      // Check from end date backwards for current streak
      let checkDate = new Date(endDate);
      while (checkDate >= startDate) {
        const dateStr = checkDate.toISOString().slice(0, 10);
        if (activityMap[dateStr] && activityMap[dateStr] > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (currentStreak > 0) {
          break;
        } else {
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }

      // Calculate best streak
      let prevDate = null;
      for (const dateStr of sortedDates) {
        const currentDate = new Date(dateStr);
        if (prevDate) {
          const dayDiff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
          if (dayDiff === 1) {
            tempStreak++;
          } else {
            bestStreak = Math.max(bestStreak, tempStreak);
            tempStreak = 1;
          }
        } else {
          tempStreak = 1;
        }
        prevDate = currentDate;
      }
      bestStreak = Math.max(bestStreak, tempStreak);

      return { currentStreak, bestStreak };
    };

    const { currentStreak, bestStreak } = calculateStreaks();
    const totalActiveDays = Object.keys(activityMap).length;

    res.json({
      activityByDate: activityMap,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      stats: {
        totalActiveDays,
        totalDaysInRange: 365,
        currentStreak,
        bestStreak,
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

  // Always use rolling 365-day window ending today
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 364);
  startDate.setHours(0, 0, 0, 0);

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

    // Calculate streaks
    const calculateStreaks = () => {
      const sortedDates = Object.keys(activityMap).sort();
      if (sortedDates.length === 0) return { currentStreak: 0, bestStreak: 0 };

      let currentStreak = 0;
      let bestStreak = 0;
      let tempStreak = 0;
      
      let checkDate = new Date(endDate);
      while (checkDate >= startDate) {
        const dateStr = checkDate.toISOString().slice(0, 10);
        if (activityMap[dateStr] && activityMap[dateStr] > 0) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (currentStreak > 0) {
          break;
        } else {
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }

      let prevDate = null;
      for (const dateStr of sortedDates) {
        const currentDate = new Date(dateStr);
        if (prevDate) {
          const dayDiff = Math.floor((currentDate - prevDate) / (1000 * 60 * 60 * 24));
          if (dayDiff === 1) {
            tempStreak++;
          } else {
            bestStreak = Math.max(bestStreak, tempStreak);
            tempStreak = 1;
          }
        } else {
          tempStreak = 1;
        }
        prevDate = currentDate;
      }
      bestStreak = Math.max(bestStreak, tempStreak);

      return { currentStreak, bestStreak };
    };

    const { currentStreak, bestStreak } = calculateStreaks();
    const totalActiveDays = Object.keys(activityMap).length;

    res.json({
      activityByDate: activityMap,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      stats: {
        totalActiveDays,
        totalDaysInRange: 365,
        currentStreak,
        bestStreak,
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
