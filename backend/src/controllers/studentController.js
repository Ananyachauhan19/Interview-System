import Papa from 'papaparse';
import User from '../models/User.js';
import { sendMail, renderTemplate } from '../utils/mailer.js';
import { sendOnboardingEmail } from '../utils/mailer.js';

export async function listAllStudents(req, res) {
  try {
    const { search } = req.query;
    let query = { role: 'student' };
    
    // Add search filter if provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query = {
        role: 'student',
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { studentId: searchRegex }
        ]
      };
    }
    
    const students = await User.find(query)
      .select('name email studentId course branch college createdAt')
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

  // Required fields for onboarding
  const requiredFields = ['name', 'email', 'studentid', 'branch'];

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
    const { course, name, email, studentid, password, branch, college } = row;

    // Skip completely empty rows
    if (!email && !studentid && !name) continue;

    // Check required fields
    const missing = requiredFields.filter((f) => {
      if (f === 'studentid') return !studentid;
      return !(row[f] && row[f].toString().trim());
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

    // Mark as ready to create
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

  // Required fields for onboarding
  const requiredFields = ['name', 'email', 'studentid', 'branch'];

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
    const { course, name, email, studentid, password, branch, college } = row;

    // Skip completely empty rows
    if (!email && !studentid && !name) continue;

    // Check required fields
    const missing = requiredFields.filter((f) => {
      if (f === 'studentid') return !studentid;
      return !(row[f] && row[f].toString().trim());
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
      // Use student ID as default password if not provided
      const defaultPassword = password || studentid;
      const passwordHash = await User.hashPassword(defaultPassword);
      const user = await User.create({
        role: 'student', course, name, email, studentId: studentid, passwordHash, branch, college,
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
    const { name, email, studentid, password, branch, course, college } = req.body || {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name || !email || !studentid || !branch) return res.status(400).json({ error: 'Missing required fields (name, email, studentid, branch)' });
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });

    const exists = await User.findOne({ $or: [{ email }, { studentId: studentid }] });
    if (exists) return res.status(409).json({ error: 'Student with email or studentId already exists' });

    // Use student ID as default password if not provided
    const defaultPassword = password || studentid;
    const passwordHash = await User.hashPassword(defaultPassword);
    const user = await User.create({ role: 'student', name, email, studentId: studentid, passwordHash, branch, course, college, mustChangePassword: true });

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
  };
}

function generateTempPassword() {
  return Math.random().toString(36).slice(2, 10);
}
