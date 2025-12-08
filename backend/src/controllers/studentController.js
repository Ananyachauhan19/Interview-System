import Papa from 'papaparse';
import User from '../models/User.js';
import Event from '../models/Event.js';
import { sendMail, renderTemplate } from '../utils/mailer.js';
import { sendOnboardingEmail } from '../utils/mailer.js';
import SpecialStudent from '../models/SpecialStudent.js';

export async function listAllStudents(req, res) {
  try {
    const { search } = req.query;
    const user = req.user;
    let query = { role: 'student' };
    
    // Coordinators see only their assigned students
    if (user.role === 'coordinator') {
      query.teacherId = user.coordinatorId;
    }
    
    // Add search filter if provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const baseQuery = user.role === 'coordinator' ? { role: 'student', teacherId: user.coordinatorId } : { role: 'student' };
      query = {
        ...baseQuery,
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { studentId: searchRegex }
        ]
      };
    }
    
    const students = await User.find(query)
      .select('name email studentId course branch college semester teacherId createdAt')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({ count: students.length, students });
  } catch (err) {
    console.error('Error listing students:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
}

export async function checkStudentsCsv(req, res) {
  if (!req.file) return res.status(400).json({ error: 'CSV file required' });
  const csvText = req.file.buffer.toString('utf8');
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data;
  const results = [];

  // Required fields for onboarding - all 9 fields must be present
  const requiredFields = ['course', 'name', 'email', 'studentid', 'password', 'branch', 'college', 'teacherid', 'semester'];

  // Track duplicates inside the CSV
  const seenEmails = new Set();
  const seenStudentIds = new Set();

  // Normalize all rows first and collect emails/studentids for bulk DB check
  const normalizedRows = rows.map((r, idx) => ({ ...normalizeRow(r), __row: idx + 2 })); // header is line 1
  const emails = normalizedRows.map((r) => r.email).filter(Boolean);
  const studentIds = normalizedRows.map((r) => r.studentid).filter(Boolean);

  // Bulk query existing users in DB to avoid per-row queries
  const existing = await User.find({ $or: [{ email: { $in: emails } }, { studentId: { $in: studentIds } }] }).select('email studentId').lean();
  const existingEmails = new Set(existing.map((u) => (u.email || '').toLowerCase()));
  const existingStudentIds = new Set(existing.map((u) => (u.studentId || '').toString()));

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const row of normalizedRows) {
    const { course, name, email, studentid, password, branch, college, teacherid } = row;

    // Skip completely empty rows
    if (!email && !studentid && !name) continue;

    // Check required fields - all must be present and non-empty
    const missing = requiredFields.filter((f) => {
      const value = row[f];
      return !value || !value.toString().trim();
    });
    if (missing.length > 0) {
      results.push({ row: row.__row, email, studentid, status: 'missing_fields', missing });
      continue;
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      results.push({ row: row.__row, email, studentid, status: 'invalid_email' });
      continue;
    }

    // Check duplicates inside the CSV file
    const lowerEmail = email.toLowerCase();
    if (seenEmails.has(lowerEmail) || seenStudentIds.has(studentid)) {
      results.push({ row: row.__row, email, studentid, status: 'duplicate_in_file' });
      continue;
    }
    seenEmails.add(lowerEmail);
    seenStudentIds.add(studentid);

    // Check existing in User DB (keep this check for regular students)
    if (existingEmails.has(lowerEmail) || existingStudentIds.has(studentid)) {
      results.push({ row: row.__row, email, studentid, status: 'exists' });
      continue;
    }

    // Mark as ready to create (don't show SpecialStudent info to user)
    results.push({ row: row.__row, email, studentid, status: 'ready' });
  }

  res.json({ count: results.length, results });
}

export async function uploadStudentsCsv(req, res) {
  if (!req.file) return res.status(400).json({ error: 'CSV file required' });
  const csvText = req.file.buffer.toString('utf8');
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data;
  const results = [];

  // Required fields for onboarding - all 9 fields must be present
  const requiredFields = ['course', 'name', 'email', 'studentid', 'password', 'branch', 'college', 'teacherid', 'semester'];

  // Track duplicates inside the CSV
  const seenEmails = new Set();
  const seenStudentIds = new Set();

  // Normalize all rows first and collect emails/studentids for bulk DB check
  const normalizedRows = rows.map((r, idx) => ({ ...normalizeRow(r), __row: idx + 2 })); // header is line 1
  const emails = normalizedRows.map((r) => r.email).filter(Boolean);
  const studentIds = normalizedRows.map((r) => r.studentid).filter(Boolean);

  // Bulk query existing users in DB to avoid per-row queries
  const existing = await User.find({ $or: [{ email: { $in: emails } }, { studentId: { $in: studentIds } }] }).select('email studentId').lean();
  const existingEmails = new Set(existing.map((u) => (u.email || '').toLowerCase()));
  const existingStudentIds = new Set(existing.map((u) => (u.studentId || '').toString()));

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const newStudents = []; // Collect new students for async email sending

  for (const row of normalizedRows) {
    const { course, name, email, studentid, password, branch, college, teacherid } = row;

    // Skip completely empty rows
    if (!email && !studentid && !name) continue;

    // Check required fields - all must be present and non-empty
    const missing = requiredFields.filter((f) => {
      const value = row[f];
      return !value || !value.toString().trim();
    });
    if (missing.length > 0) {
      results.push({ row: row.__row, email, studentid, status: 'missing_fields', missing });
      continue;
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      results.push({ row: row.__row, email, studentid, status: 'invalid_email' });
      continue;
    }

    // Check duplicates inside the CSV file
    const lowerEmail = email.toLowerCase();
    if (seenEmails.has(lowerEmail) || seenStudentIds.has(studentid)) {
      results.push({ row: row.__row, email, studentid, status: 'duplicate_in_file' });
      continue;
    }
    seenEmails.add(lowerEmail);
    seenStudentIds.add(studentid);

    // Check existing in DB
    if (existingEmails.has(lowerEmail) || existingStudentIds.has(studentid)) {
      results.push({ row: row.__row, email, studentid, status: 'exists' });
      continue;
    }

    // Create user
    try {
      // Check if student exists in SpecialStudent collection
      const existingSpecial = await SpecialStudent.findOne({
        $or: [{ email: lowerEmail }, { studentId: studentid }]
      });
      
      if (existingSpecial) {
        // Create User with SpecialStudent's preserved password
        const user = await User.create({
          role: 'student',
          course: course || existingSpecial.course,
          name: name || existingSpecial.name,
          email,
          studentId: studentid,
          passwordHash: existingSpecial.passwordHash, // Preserve password
          branch: branch || existingSpecial.branch,
          college: college || existingSpecial.college,
          mustChangePassword: existingSpecial.mustChangePassword, // Preserve password change status
        });
        
        results.push({ 
          row: row.__row, 
          id: user._id, 
          email, 
          studentid, 
          status: 'linked_from_special',
          message: 'Student exists in special events - linked with preserved password'
        });
        
        // Don't send onboarding email - they already have credentials
        continue;
      }
      
      // Use student ID as default password if not provided
      const defaultPassword = password || studentid;
      const passwordHash = await User.hashPassword(defaultPassword);
      const semesterNum = parseInt(row.semester);
      if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
        results.push({ row: row.__row, email, studentid, status: 'error', message: 'Semester must be between 1 and 8' });
        continue;
      }
      const user = await User.create({
        role: 'student', course, name, email, studentId: studentid, passwordHash, branch, college,
        teacherId: teacherid,
        semester: semesterNum,
        mustChangePassword: true,
      });
      results.push({ row: row.__row, id: user._id, email, studentid, status: 'created' });
      
      // Store for async email sending
      if (process.env.EMAIL_ON_ONBOARD === 'true' && email) {
        newStudents.push({ email, studentId: studentid, password: password || studentid });
      }
    } catch (err) {
      results.push({ row: row.__row, email, studentid, status: 'error', message: err.message });
    }
  }

  // Send response immediately
  res.json({ count: results.length, results });

  // Send emails asynchronously after response
  if (newStudents.length > 0) {
    setImmediate(async () => {
      try {
        // Send all emails in parallel for faster delivery
        const emailPromises = newStudents.map(student => 
          sendOnboardingEmail({
            to: student.email,
            studentId: student.studentId,
            password: student.password,
          }).catch(err => {
            console.error(`[uploadStudentsCsv] Failed to send email to ${student.email}:`, err.message);
            return null; // Continue with other emails even if one fails
          })
        );
        
        await Promise.all(emailPromises);
        console.log(`[uploadStudentsCsv] Sent onboarding emails to ${newStudents.length} new students`);
      } catch (err) {
        console.error('[uploadStudentsCsv] Error sending onboarding emails:', err.message);
      }
    });
  }
}

export async function createStudent(req, res) {
  try {
    const { name, email, studentid, password, branch, course, college, teacherid, semester } = req.body || {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Check all required fields
    if (!name || !email || !studentid || !password || !branch || !course || !college || !teacherid || !semester) {
      return res.status(400).json({ error: 'All fields are required: name, email, studentid, password, branch, course, college, teacherid, semester' });
    }
    
    const semesterNum = parseInt(semester);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      return res.status(400).json({ error: 'Semester must be a number between 1 and 8' });
    }
    
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

    const exists = await User.findOne({ $or: [{ email }, { studentId: studentid }] });
    if (exists) return res.status(409).json({ error: 'Student with email or studentId already exists' });

    // Use student ID as default password if not provided
    const defaultPassword = password || studentid;
    const passwordHash = await User.hashPassword(defaultPassword);
    const user = await User.create({ role: 'student', name, email, studentId: studentid, passwordHash, branch, course, college, teacherId: teacherid, semester: semesterNum, mustChangePassword: true });

    if (process.env.EMAIL_ON_ONBOARD === 'true' && email) {
      await sendOnboardingEmail({
        to: email,
        studentId: studentid,
        password: defaultPassword,
      });
    }

    return res.status(201).json({ id: user._id, email: user.email, studentid: user.studentId, status: 'created' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function normalizeRow(r) {
  const map = {};
  for (const [k, v] of Object.entries(r)) map[k.trim().toLowerCase()] = (v ?? '').toString().trim();
  return {
    course: map.course,
    name: map.name,
    email: map.email,
    studentid: map.studentid || map.student_id || map.sid,
    password: map.password,
    branch: map.branch,
    college: map.college,
    teacherid: map.teacherid || map.teacher_id || map.teacherId,
    semester: map.semester,
  };
}

function generateTempPassword() {
  return Math.random().toString(36).slice(2, 10);
}

// List all special students across all special events
export async function listAllSpecialStudents(req, res) {
  try {
    const { search } = req.query;
    let query = {};
    
    // Add search filter if provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { studentId: searchRegex },
          { branch: searchRegex },
          { course: searchRegex },
          { college: searchRegex }
        ]
      };
    }
    
    const specialStudents = await SpecialStudent.find(query)
      .populate({
        path: 'events',
        select: 'name isSpecial coordinatorId'
      })
      .select('name email studentId course branch college semester events createdAt teacherId')
      .sort({ createdAt: -1 })
      .lean();

    // Get all unique coordinator IDs from events
    const coordinatorIds = new Set();
    specialStudents.forEach(student => {
      student.events?.forEach(event => {
        if (event.coordinatorId) {
          coordinatorIds.add(event.coordinatorId);
        }
      });
    });

    // Fetch all coordinators at once
    const coordinators = await User.find({
      $or: [
        { coordinatorId: { $in: Array.from(coordinatorIds) } },
        { _id: { $in: Array.from(coordinatorIds).filter(id => id.match(/^[0-9a-fA-F]{24}$/)) } }
      ]
    }).select('_id name email coordinatorId').lean();

    // Create a map for quick lookup
    const coordMap = new Map();
    coordinators.forEach(coord => {
      if (coord.coordinatorId) coordMap.set(coord.coordinatorId, coord);
      coordMap.set(coord._id.toString(), coord);
    });

    // As a fallback, fetch matching regular Users to derive teacherId when missing
    const allEmails = specialStudents.map(s => s.email).filter(Boolean);
    const allSids = specialStudents.map(s => s.studentId).filter(Boolean);
    const userRecords = await User.find({ $or: [ { email: { $in: allEmails } }, { studentId: { $in: allSids } } ] })
      .select('email studentId teacherId name')
      .lean();
    const userMapByEmail = new Map(userRecords.map(u => [String(u.email).toLowerCase(), u]));
    const userMapBySid = new Map(userRecords.map(u => [String(u.studentId), u]));

    // Extract coordinator info from events and add to each student
    const studentsWithCoordinator = specialStudents.map(student => {
      // Get the first event's coordinator (most special students have one event)
      const firstEvent = student.events && student.events.length > 0 ? student.events[0] : null;
      const coordId = firstEvent?.coordinatorId;
      const coordinator = coordId ? coordMap.get(coordId) : null;
      const teacherFromStudent = student.teacherId;
      // Fallback to matching regular User.teacherId if available
      let teacherFromUser = null;
      const u1 = student.email ? userMapByEmail.get(String(student.email).toLowerCase()) : null;
      const u2 = !u1 && student.studentId ? userMapBySid.get(String(student.studentId)) : null;
      teacherFromUser = (u1?.teacherId || u2?.teacherId) || null;
      return {
        ...student,
        // Prefer teacherId stored on student (from CSV/admin), fallback to event coordinator mapping, then User.teacherId
        teacherId: teacherFromStudent || coordinator?.coordinatorId || coordinator?.name || teacherFromUser || '-',
        coordinatorEmail: coordinator?.email || '-'
      };
    });

    res.json({ count: studentsWithCoordinator.length, students: studentsWithCoordinator });
  } catch (err) {
    console.error('Error listing special students:', err);
    res.status(500).json({ error: 'Failed to fetch special students' });
  }
}

// List special students for a specific event
export async function listSpecialStudentsByEvent(req, res) {
  try {
    const { eventId } = req.params;
    
    // First get the event to find its coordinator
    const event = await Event.findById(eventId)
      .select('coordinatorId')
      .lean();
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Fetch coordinator details
    let coordinator = null;
    if (event.coordinatorId) {
      coordinator = await User.findOne({ coordinatorId: event.coordinatorId })
        .select('name email coordinatorId')
        .lean();
      
      // If not found by coordinatorId, try by _id if it looks like ObjectId
      if (!coordinator && event.coordinatorId.match(/^[0-9a-fA-F]{24}$/)) {
        coordinator = await User.findById(event.coordinatorId)
          .select('name email coordinatorId')
          .lean();
      }
    }
    
    const specialStudents = await SpecialStudent.find({ events: eventId })
      .select('name email studentId course branch college semester createdAt teacherId')
      .sort({ createdAt: -1 })
      .lean();
    
    // Add coordinator info to each student
    const studentsWithCoordinator = specialStudents.map(student => ({
      ...student,
      teacherId: student.teacherId || coordinator?.coordinatorId || coordinator?.name || '-',
      coordinatorEmail: coordinator?.email || '-'
    }));
    
    res.json({ count: studentsWithCoordinator.length, students: studentsWithCoordinator });
  } catch (err) {
    console.error('Error listing special students by event:', err);
    res.status(500).json({ error: 'Failed to fetch special students for event' });
  }
}
