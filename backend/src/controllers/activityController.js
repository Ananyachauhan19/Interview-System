import Pair from '../models/Pair.js';
import Progress from '../models/Progress.js';
import User from '../models/User.js';
import SpecialStudent from '../models/SpecialStudent.js';
import StudentActivity from '../models/StudentActivity.js';
import Subject from '../models/Subject.js';
import { HttpError } from '../utils/errors.js';

// Helper: determine learning scope (semesters/subjects/videos) for a given student
// based on their current semester. This is used for both profile stats and
// contribution calendar summary cards so that "Courses Enrolled" and
// "Videos Watched" are always computed from the learning modules actually
// assigned to the student.
async function computeLearningScopeForStudent(student) {
  // Fallback: if student or semester is missing, include all semesters
  const semesters = await Subject.find().sort('order');

  const normalizeSubjectName = (name) => {
    if (!name) return '';
    return String(name)
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const allowedSemesterIds = [];
  const subjectKeys = new Set();
  const validTopicIds = new Set(); // Track all valid topic IDs in curriculum
  let totalVideosTotal = 0;

  const hasSemesterNumber = student && typeof student.semester === 'number';

  semesters.forEach(semester => {
    // If the student has a defined semester, only include semesters up to that
    if (hasSemesterNumber) {
      const match = semester.semesterName?.match(/\d+/);
      if (match) {
        const semNum = parseInt(match[0], 10);
        if (Number.isFinite(semNum) && semNum > student.semester) {
          return; // skip higher semesters
        }
      }
    }

    allowedSemesterIds.push(semester._id);

    // Collect unique logical subjects (per semester name + normalized subject name)
    semester.subjects?.forEach(subject => {
      const key = `${semester.semesterName || ''}::${normalizeSubjectName(subject.subjectName)}`;
      subjectKeys.add(key);

      // Count total videos available in curriculum (topics with a video link)
      subject.chapters?.forEach(chapter => {
        chapter.topics?.forEach(topic => {
          // Track all valid topic IDs
          validTopicIds.add(topic._id.toString());
          
          if (topic.topicVideoLink) {
            totalVideosTotal += 1;
          }
        });
      });
    });
  });

  return {
    allowedSemesterIds,
    totalCourses: subjectKeys.size,
    totalVideosTotal,
    validTopicIds: Array.from(validTopicIds).map(id => new Subject.base.Types.ObjectId(id))
  };
}

/**
 * Log student activity for contribution calendar
 */
export async function logStudentActivity({ studentId, studentModel, activityType, metadata = {} }) {
  try {
    await StudentActivity.create({
      studentId,
      studentModel,
      activityType,
      metadata,
      date: new Date()
    });
  } catch (error) {
    console.error('[Log Student Activity Error]', error);
    // Non-blocking - don't throw error
  }
}

/**
 * Get student activity data for contribution calendar with comprehensive stats
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
    // Determine learning scope for this student (which semesters/subjects/videos count)
    const { allowedSemesterIds, totalCourses, totalVideosTotal, validTopicIds } = await computeLearningScopeForStudent(user);

    // 1. Get all student activities from StudentActivity collection
    const activities = await StudentActivity.aggregate([
      {
        $match: {
          studentId: user._id,
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // 2. Get scheduled sessions within range
    const isSpecialStudent = Boolean(user.isSpecialStudent);
    const scheduledSessions = await Pair.aggregate([
      {
        $match: {
          $or: [
            { interviewer: user._id, interviewerModel: isSpecialStudent ? 'SpecialStudent' : 'User' },
            { interviewee: user._id, intervieweeModel: isSpecialStudent ? 'SpecialStudent' : 'User' }
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

    // 3. Get completed topics within range
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

    // 4. Merge activity data from all sources
    const activityMap = {};

    // Base activities from StudentActivity collection (videos watched, problems solved, etc.)
    activities.forEach(item => {
      activityMap[item._id] = item.count;
    });

    // Scheduled interview sessions
    scheduledSessions.forEach(item => {
      const date = item._id;
      if (!activityMap[date]) activityMap[date] = 0;
      activityMap[date] += item.count;
    });

    // Completed learning topics
    completedTopics.forEach(item => {
      const date = item._id;
      if (!activityMap[date]) activityMap[date] = 0;
      activityMap[date] += item.count;
    });

    console.log('[getStudentActivity] Activities from StudentActivity:', activities.length);
    console.log('[getStudentActivity] Scheduled sessions:', scheduledSessions.length);
    console.log('[getStudentActivity] Completed topics:', completedTopics.length);
    console.log('[getStudentActivity] Total activity dates:', Object.keys(activityMap).length);
    console.log('[getStudentActivity] Sample activityMap:', Object.entries(activityMap).slice(0, 5));

    // 5. Calculate streaks based on merged activity map
    const sortedDates = Object.keys(activityMap).sort();
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    const today = new Date().toISOString().split('T')[0];

    // Calculate best streak
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          bestStreak = Math.max(bestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    bestStreak = Math.max(bestStreak, tempStreak);

    // Calculate current streak (working backwards from today)
    if (sortedDates.length > 0) {
      const todayOrYesterday = [today, new Date(Date.now() - 86400000).toISOString().split('T')[0]];
      if (todayOrYesterday.includes(sortedDates[sortedDates.length - 1])) {
        currentStreak = 1;
        for (let i = sortedDates.length - 2; i >= 0; i--) {
          const currDate = new Date(sortedDates[i + 1]);
          const prevDate = new Date(sortedDates[i]);
          const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // 4. Get total videos watched (all time) within the allowed semesters and valid topics only
    const videoWatchMatch = {
      studentId: user._id,
      videoWatchedSeconds: { $gt: 0 }
    };
    if (allowedSemesterIds.length > 0) {
      videoWatchMatch.semesterId = { $in: allowedSemesterIds };
    }
    // Only count videos for topics that still exist in the curriculum
    if (validTopicIds.length > 0) {
      videoWatchMatch.topicId = { $in: validTopicIds };
    }
    const videosWatchedAgg = await Progress.aggregate([
      { $match: videoWatchMatch },
      { $group: { _id: '$topicId' } },
      { $count: 'totalVideos' }
    ]);
    const videoWatchCount = videosWatchedAgg[0]?.totalVideos || 0;

    // 5. Get total problems solved (all time)
    const problemsSolvedCount = await StudentActivity.countDocuments({
      studentId: user._id,
      activityType: 'PROBLEM_SOLVED'
    });

    // 6. Use learning scope helper for total subjects and total videos in curriculum
    const totalSubjects = totalCourses;

    res.json({
      activityByDate: activityMap,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      stats: {
        totalActiveDays: sortedDates.length,
        totalDaysInRange: 365,
        currentStreak,
        bestStreak,
        totalSubjects,
        totalVideosWatched: videoWatchCount,
        totalVideosTotal,
        totalProblemsSolved: problemsSolvedCount,
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
  
  if (!studentId) throw new HttpError(400, 'Student ID is required');

  // Find the student
  let student = await User.findById(studentId);
  let studentModel = 'User';
  if (!student) {
    student = await SpecialStudent.findById(studentId);
    studentModel = 'SpecialStudent';
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
    // 1. Get all student activities from StudentActivity collection
    const activities = await StudentActivity.aggregate([
      {
        $match: {
          studentId: student._id,
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          count: { $sum: 1 }
        }
      }
    ]);

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
    
    // Start with activities from StudentActivity collection
    activities.forEach(item => {
      activityMap[item._id] = item.count;
    });
    
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

    // Determine learning scope for this student (semesters/subjects/videos assigned)
    const { allowedSemesterIds, totalCourses, totalVideosTotal, validTopicIds } = await computeLearningScopeForStudent(student);

    // 4. Get total videos watched (all time) within the allowed semesters and valid topics only
    const videoWatchMatch = {
      studentId: student._id,
      videoWatchedSeconds: { $gt: 0 }
    };
    if (allowedSemesterIds.length > 0) {
      videoWatchMatch.semesterId = { $in: allowedSemesterIds };
    }
    // Only count videos for topics that still exist in the curriculum
    if (validTopicIds.length > 0) {
      videoWatchMatch.topicId = { $in: validTopicIds };
    }
    const videosWatchedAgg = await Progress.aggregate([
      { $match: videoWatchMatch },
      { $group: { _id: '$topicId' } },
      { $count: 'totalVideos' }
    ]);
    const videoWatchCount = videosWatchedAgg[0]?.totalVideos || 0;

    // 5. Get total problems solved (all time)
    const problemsSolvedCount = await StudentActivity.countDocuments({
      studentId: student._id,
      activityType: 'PROBLEM_SOLVED'
    });

    // 6. Use learning scope helper for total subjects and total videos in curriculum
    const totalSubjects = totalCourses;

    res.json({
      activityByDate: activityMap,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      stats: {
        totalActiveDays,
        totalDaysInRange: 365,
        currentStreak,
        bestStreak,
        totalSubjects,
        totalVideosWatched: videoWatchCount,
        totalVideosTotal,
        totalProblemsSolved: problemsSolvedCount,
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

/**
 * Get comprehensive student statistics for profile tabs
 */
export async function getStudentStats(req, res) {
  const user = req.user;
  let studentId = req.params.studentId;

  // If no studentId in params, use current user (student viewing own profile)
  if (!studentId && user.role === 'student') {
    studentId = user._id;
  }

  // Authorization check
  if (!studentId) throw new HttpError(400, 'Student ID is required');
  if (user.role !== 'admin' && user.role !== 'coordinator' && user._id.toString() !== studentId) {
    throw new HttpError(403, 'Access denied');
  }

  try {
    // Find the student
    let student = await User.findById(studentId);
    if (!student) {
      student = await SpecialStudent.findById(studentId);
    }
    if (!student) throw new HttpError(404, 'Student not found');

    // Determine learning scope for this student (semesters/subjects/videos assigned)
    const { allowedSemesterIds, totalCourses, totalVideosTotal, validTopicIds } = await computeLearningScopeForStudent(student);

    // Base match for all Progress-based stats (restricted to allowed semesters when available)
    const baseMatch = {
      studentId: student._id
    };
    if (allowedSemesterIds.length > 0) {
      baseMatch.semesterId = { $in: allowedSemesterIds };
    }
    // Only count progress for topics that still exist in the curriculum
    if (validTopicIds.length > 0) {
      baseMatch.topicId = { $in: validTopicIds };
    }

    // 1. Get total courses enrolled (unique subjects within allowed semesters)
    // We already have totalCourses from the learning scope helper, which counts
    // unique logical subjects across the allowed semesters.

    // 2. Get total videos watched (topics with videoWatchedSeconds > 0) within allowed semesters
    const videosWatched = await Progress.aggregate([
      {
        $match: {
          ...baseMatch,
          videoWatchedSeconds: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$topicId'
        }
      },
      {
        $count: 'totalVideos'
      }
    ]);
    const totalVideosWatched = videosWatched[0]?.totalVideos || 0;

    // 3. Get total problems solved (completed topics) within allowed semesters
    const problemsSolved = await Progress.countDocuments({
      ...baseMatch,
      completed: true
    });

    // 4. Get total watch time in hours within allowed semesters
    const watchTimeData = await Progress.aggregate([
      {
        $match: baseMatch
      },
      {
        $group: {
          _id: null,
          totalSeconds: { $sum: '$videoWatchedSeconds' }
        }
      }
    ]);
    const totalWatchTimeHours = watchTimeData[0] ? Math.round((watchTimeData[0].totalSeconds / 3600) * 10) / 10 : 0;

    res.json({
      success: true,
      stats: {
        totalCoursesEnrolled: totalCourses,
        totalVideosWatched: totalVideosWatched,
        problemsSolved: problemsSolved,
        totalWatchTimeHours: totalWatchTimeHours
      }
    });
  } catch (error) {
    console.error('[Get Student Stats Error]', error);
    throw new HttpError(500, 'Failed to fetch student statistics');
  }
}
