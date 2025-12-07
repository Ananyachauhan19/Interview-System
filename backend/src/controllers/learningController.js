import Semester from '../models/Subject.js';
import Progress from '../models/Progress.js';
import User from '../models/User.js';

// Get all semesters with all subjects from all coordinators
export const getAllSemestersForStudent = async (req, res) => {
  try {
    console.log('[Learning] Getting all semesters for student:', req.user._id);
    
    const semesters = await Semester.find().sort('order');

    // Build a map of coordinators by their business coordinatorId (string)
    const coordinators = await User.find({ role: 'coordinator' })
      .select('_id name email coordinatorId');
    const coordByBusinessId = new Map(
      coordinators
        .filter(c => !!c.coordinatorId)
        .map(c => [String(c.coordinatorId), { userId: String(c._id), name: c.name, email: c.email }])
    );
    const coordByObjectId = new Map(
      coordinators.map(c => [String(c._id), { userId: String(c._id), name: c.name, email: c.email, businessId: c.coordinatorId }])
    );

    console.log('[Learning] Found semesters:', semesters.length);

    // Get student's current semester for filtering (students only, not admins)
    let studentSemester = null;
    if (req.user.role === 'student') {
      studentSemester = req.user.semester;
      console.log('[Learning] Student semester:', studentSemester);
    }

    // Group subjects by semester and subject name
    const semesterMap = {};

    semesters.forEach(semester => {
      const semesterKey = semester.semesterName;
      
      if (!semesterMap[semesterKey]) {
        semesterMap[semesterKey] = {
          semesterName: semester.semesterName,
          semesterDescription: semester.semesterDescription,
          subjects: {}
        };
      }

      semester.subjects.forEach(subject => {
        // Normalize subject name to title case for grouping
        const normalizeSubjectName = (name) => {
          return name.toLowerCase().split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ');
        };
        const subjectKey = normalizeSubjectName(subject.subjectName);
        
        if (!semesterMap[semesterKey].subjects[subjectKey]) {
          semesterMap[semesterKey].subjects[subjectKey] = {
            subjectName: subjectKey, // Use normalized name
            subjectDescription: subject.subjectDescription,
            coordinators: [],
            teacherMap: {} // Track teachers by normalized name
          };
        }

        // Lookup coordinator user details by business coordinatorId (string on semester)
        const rawCoordId = String(semester.coordinatorId);
        const coordInfo = coordByBusinessId.get(rawCoordId) || coordByObjectId.get(rawCoordId) || null;
        const displayName = coordInfo?.name || '';
        const displayEmail = coordInfo?.email || '';
        const finalName = displayName || (displayEmail ? displayEmail.split('@')[0] : 'Teacher');

        // Normalize teacher name to avoid case-sensitive duplicates per subject
        const teacherKey = finalName.toLowerCase();

        // Only add if not already present (case-insensitive check)
        if (!semesterMap[semesterKey].subjects[subjectKey].teacherMap[teacherKey]) {
          const teacherData = {
            // Keep using the stored coordinatorId (can be business id or ObjectId string)
            coordinatorId: rawCoordId,
            coordinatorName: finalName,
            coordinatorEmail: displayEmail,
            semesterId: semester._id,
            subjectId: subject._id
          };

          semesterMap[semesterKey].subjects[subjectKey].coordinators.push(teacherData);
          semesterMap[semesterKey].subjects[subjectKey].teacherMap[teacherKey] = true;
        }
      });
    });

    // Convert to array format
    const result = Object.keys(semesterMap).map(semesterName => ({
      semesterName,
      semesterDescription: semesterMap[semesterName].semesterDescription,
      subjects: Object.keys(semesterMap[semesterName].subjects).map(subjectName => {
        const subject = semesterMap[semesterName].subjects[subjectName];
        // Remove teacherMap before sending
        delete subject.teacherMap;
        return {
          subjectName,
          subjectDescription: subject.subjectDescription,
          coordinators: subject.coordinators
        };
      })
    }));

    // Filter by student semester if user is a student
    let filteredResult = result;
    if (studentSemester !== null && studentSemester !== undefined) {
      filteredResult = result.filter(sem => {
        // Extract semester number from semester name (e.g., "Semester 1" -> 1)
        const match = sem.semesterName.match(/\d+/);
        if (match) {
          const semNum = parseInt(match[0]);
          return semNum <= studentSemester;
        }
        // If no number found, include it (edge case)
        return true;
      });
      console.log(`[Learning] Filtered ${result.length} semesters to ${filteredResult.length} for student semester ${studentSemester}`);
    }

    res.json(filteredResult);
  } catch (error) {
    console.error('Error fetching semesters for student:', error);
    res.status(500).json({ message: 'Failed to fetch semesters', error: error.message });
  }
};

// Get all subjects by a specific coordinator
export const getCoordinatorSubjects = async (req, res) => {
  try {
    const { coordinatorId } = req.params;

    const semesters = await Semester.find({ coordinatorId }).sort('order');

    // Fetch the coordinator user for name/email
    const coordUser = await User.findOne({ $or: [ { coordinatorId }, { _id: coordinatorId } ] }).select('_id name email coordinatorId');

    // Flatten all subjects from all semesters
    const allSubjects = [];

    semesters.forEach(semester => {
      semester.subjects.forEach(subject => {
        allSubjects.push({
          semesterId: semester._id,
          semesterName: semester.semesterName,
          subjectId: subject._id,
          subjectName: subject.subjectName,
          subjectDescription: subject.subjectDescription,
          coordinatorId: semester.coordinatorId,
          coordinatorName: (coordUser?.name || (coordUser?.email ? coordUser.email.split('@')[0] : 'Teacher')),
          coordinatorEmail: coordUser?.email || ''
        });
      });
    });

    res.json(allSubjects);
  } catch (error) {
    console.error('Error fetching coordinator subjects:', error);
    res.status(500).json({ message: 'Failed to fetch coordinator subjects', error: error.message });
  }
};

// Get specific subject with all chapters and topics
export const getSubjectDetails = async (req, res) => {
  try {
    const { semesterId, subjectId } = req.params;

    const semester = await Semester.findById(semesterId);

    if (!semester) {
      return res.status(404).json({ message: 'Semester not found' });
    }

    const subject = semester.subjects.id(subjectId);

    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Lookup coordinator details
    const coordUser = await User.findOne({ $or: [ { coordinatorId: semester.coordinatorId }, { _id: semester.coordinatorId } ] }).select('name email coordinatorId');

    const response = {
      semesterId: semester._id,
      semesterName: semester.semesterName,
      subjectId: subject._id,
      subjectName: subject.subjectName,
      subjectDescription: subject.subjectDescription,
      coordinatorId: semester.coordinatorId,
      coordinatorName: (coordUser?.name || (coordUser?.email ? coordUser.email.split('@')[0] : 'Teacher')),
      coordinatorEmail: coordUser?.email || '',
      chapters: subject.chapters
    };

    console.log('[getSubjectDetails] Returning:', {
      subjectName: response.subjectName,
      coordinatorName: response.coordinatorName,
      coordinatorId: response.coordinatorId
    });

    res.json(response);
  } catch (error) {
    console.error('Error fetching subject details:', error);
    res.status(500).json({ message: 'Failed to fetch subject details', error: error.message });
  }
};

// Update topic progress
export const updateTopicProgress = async (req, res) => {
  try {
    console.log('[updateTopicProgress] Params:', req.params);
    console.log('[updateTopicProgress] Body:', req.body);
    console.log('[updateTopicProgress] User:', req.user._id);
    
    const { semesterId, subjectId, chapterId, topicId } = req.params;
    const { videoWatchedSeconds, coordinatorId } = req.body;
    const studentId = req.user._id;

    if (!coordinatorId) {
      console.error('[updateTopicProgress] Missing coordinatorId');
      return res.status(400).json({ message: 'Coordinator ID is required' });
    }

    // Find or create progress record
    let progress = await Progress.findOne({ studentId, topicId });

    if (!progress) {
      console.log('[updateTopicProgress] Creating new progress record');
      progress = new Progress({
        studentId,
        semesterId,
        subjectId,
        chapterId,
        topicId,
        coordinatorId,
        videoWatchedSeconds: 0,
        completed: false
      });
    }

    progress.videoWatchedSeconds = videoWatchedSeconds;
    progress.lastAccessedAt = new Date();

    // Mark as completed if watched for 3 minutes (180 seconds)
    if (videoWatchedSeconds >= 180 && !progress.completed) {
      progress.completed = true;
      progress.completedAt = new Date();
      console.log('[updateTopicProgress] Topic marked as completed!');
    }

    await progress.save();
    console.log('[updateTopicProgress] Progress saved successfully');

    res.json({
      message: 'Progress updated',
      progress
    });
  } catch (error) {
    console.error('[updateTopicProgress] Error:', error);
    res.status(500).json({ message: 'Failed to update progress', error: error.message });
    res.status(500).json({ message: 'Failed to update progress', error: error.message });
  }
};

// Get student progress for a subject
export const getSubjectProgress = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const studentId = req.user._id;

    const progressRecords = await Progress.find({ studentId, subjectId });

    const completedTopics = progressRecords.filter(p => p.completed).length;
    const totalTopics = progressRecords.length;
    const percentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    res.json({
      completedTopics,
      totalTopics,
      percentage,
      progressRecords
    });
  } catch (error) {
    console.error('Error fetching subject progress:', error);
    res.status(500).json({ message: 'Failed to fetch progress', error: error.message });
  }
};

// Get all progress for a student (for analytics)
export const getStudentProgress = async (req, res) => {
  try {
    const studentId = req.user._id;

    const progressRecords = await Progress.find({ studentId })
      .sort('-lastAccessedAt');

    // Group by subject
    const subjectProgress = {};

    progressRecords.forEach(record => {
      const subjectId = record.subjectId.toString();
      
      if (!subjectProgress[subjectId]) {
        subjectProgress[subjectId] = {
          subjectId,
          totalTopics: 0,
          completedTopics: 0,
          topics: []
        };
      }

      subjectProgress[subjectId].totalTopics++;
      if (record.completed) {
        subjectProgress[subjectId].completedTopics++;
      }
      subjectProgress[subjectId].topics.push(record);
    });

    // Calculate percentages
    Object.keys(subjectProgress).forEach(subjectId => {
      const { completedTopics, totalTopics } = subjectProgress[subjectId];
      subjectProgress[subjectId].percentage = totalTopics > 0 
        ? Math.round((completedTopics / totalTopics) * 100) 
        : 0;
    });

    res.json({
      subjectProgress: Object.values(subjectProgress),
      totalCompleted: progressRecords.filter(p => p.completed).length,
      totalTopics: progressRecords.length
    });
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({ message: 'Failed to fetch progress', error: error.message });
  }
};

// Get progress for specific topic
export const getTopicProgress = async (req, res) => {
  try {
    const { topicId } = req.params;
    const studentId = req.user._id;

    const progress = await Progress.findOne({ studentId, topicId });

    if (!progress) {
      return res.json({
        completed: false,
        videoWatchedSeconds: 0
      });
    }

    res.json(progress);
  } catch (error) {
    console.error('Error fetching topic progress:', error);
    res.status(500).json({ message: 'Failed to fetch topic progress', error: error.message });
  }
};

// Start video tracking (3-minute timer backend)
export const startVideoTracking = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { semesterId, subjectId, chapterId, coordinatorId } = req.body;
    const studentId = req.user._id;

    console.log('[startVideoTracking] Starting for topic:', topicId);

    if (!coordinatorId) {
      return res.status(400).json({ message: 'Coordinator ID is required' });
    }

    // Find or create progress record
    let progress = await Progress.findOne({ studentId, topicId });

    if (!progress) {
      progress = new Progress({
        studentId,
        semesterId,
        subjectId,
        chapterId,
        topicId,
        coordinatorId,
        videoWatchedSeconds: 0,
        completed: false
      });
    }

    progress.lastAccessedAt = new Date();
    await progress.save();

    // Auto-complete after 3 minutes (180 seconds)
    setTimeout(async () => {
      try {
        const p = await Progress.findOne({ studentId, topicId });
        if (p && !p.completed && p.lastAccessedAt.getTime() === progress.lastAccessedAt.getTime()) {
          p.completed = true;
          p.completedAt = new Date();
          p.videoWatchedSeconds = 180;
          await p.save();
          console.log('[startVideoTracking] Auto-completed topic:', topicId);
        }
      } catch (err) {
        console.error('[startVideoTracking] Auto-complete error:', err);
      }
    }, 180000); // 3 minutes

    res.json({
      message: 'Video tracking started',
      progress
    });
  } catch (error) {
    console.error('[startVideoTracking] Error:', error);
    res.status(500).json({ message: 'Failed to start tracking', error: error.message });
  }
};
